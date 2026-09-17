from fastapi import FastAPI, Request, HTTPException, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging, asyncio, httpx, time, json
from datetime import datetime, timezone, timedelta
from pydantic_settings import BaseSettings
from pythonjsonlogger import jsonlogger
from pathlib import Path
from contextlib import asynccontextmanager
import os
from supabase import create_client, Client

# Import dependencies
from dependencies import supabase, supabase_admin, _otp_store, rate_limit, _blocked_ips, _task_last_run

# Import Routers
from routers import auth, market, community, admin, admin_data, superadmin, ai, ws

from dependencies import CORS_ORIGINS, check_maintenance_mode, DATAGOV_KEY, get_supabase, get_supabase_admin, _get_client_ip

# Module-level logger. The catch-all exception handler and other module-scope
# code below reference `logger`, so it must exist at import time (previously it
# was only defined as a local inside the metrics middleware -> NameError on 500s).
logger = logging.getLogger("krishisathi")

# ── API_METRICS_WRITER_R112 ───────────────────────────────────────────────────
# The api_metrics table is read by five admin endpoints (metrics/heatmap,
# feature-usage, error-stats, health-stats active_connections, rate-limits top
# IPs) but nothing wrote to it: this middleware only logged to stdout. Every one
# of those pages therefore rendered an empty state forever.
#
# The original reason for removing the writes was "unbounded DB tasks", which is
# a legitimate worry on a free Supabase tier - a row per request, inserted one at
# a time from the request path, is genuinely bad. So this does not go back to
# that. Requests only touch an in-memory list; a background task batches the
# whole buffer into a single insert once a minute.
#
# Guarantees:
#   * the request path never awaits the database
#   * the buffer is capped, so a traffic spike drops metrics instead of memory
#   * old rows are purged, so the table cannot grow without bound
#   * if the table does not exist, analytics disables itself after ONE failed
#     attempt and logs a single actionable message
_metrics_buffer: list = []
_METRICS_BUFFER_MAX = 500
_METRICS_FLUSH_SECONDS = 60
_METRICS_RETENTION_DAYS = 7
_METRICS_PURGE_EVERY_N_FLUSHES = 60
_metrics_enabled = True

# /health is hit constantly by uptime monitors and would swamp the heatmap.
# /api/track is unauthenticated telemetry and stays stdout-only on purpose.
_METRICS_SKIP_PATHS = {"/health", "/api/track"}


def _metrics_client():
    """Prefer the service-role client (bypasses RLS); fall back to anon."""
    return supabase_admin or supabase


async def _flush_metrics(purge: bool = False):
    global _metrics_buffer, _metrics_enabled
    if not _metrics_enabled or not _metrics_buffer:
        return
    client = _metrics_client()
    if client is None:
        _metrics_buffer = []
        return
    # Swap the buffer out first so requests arriving during the insert are not lost
    # and are never mutated while we iterate.
    batch, _metrics_buffer = _metrics_buffer, []
    try:
        await asyncio.to_thread(
            lambda: client.table("api_metrics").insert(batch).execute()
        )
    except Exception as e:
        msg = str(e).lower()
        if (
            "does not exist" in msg
            or "could not find the table" in msg
            or "pgrst205" in msg
        ):
            _metrics_enabled = False
            logger.error(
                "api_metrics table not found - request analytics is now DISABLED for "
                "this process. The Traffic Heatmap, Feature Usage and Error Rate "
                "admin pages will stay empty until setup_database.sql is run on the "
                "Supabase project. Original error: %s",
                e,
            )
        else:
            logger.warning(
                "api_metrics flush failed, dropped %d row(s): %s", len(batch), e
            )
        return

    if purge:
        try:
            cutoff = (
                datetime.now(timezone.utc) - timedelta(days=_METRICS_RETENTION_DAYS)
            ).isoformat()
            await asyncio.to_thread(
                lambda: client.table("api_metrics").delete().lt("ts", cutoff).execute()
            )
        except Exception as e:
            logger.warning("api_metrics purge failed: %s", e)


async def _metrics_flush_loop():
    ticks = 0
    while True:
        await asyncio.sleep(_METRICS_FLUSH_SECONDS)
        ticks += 1
        try:
            await _flush_metrics(
                purge=(ticks % _METRICS_PURGE_EVERY_N_FLUSHES == 0)
            )
        except Exception as e:
            logger.warning("metrics flush loop error: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from dependencies import background_data_fetcher, ensure_settings_columns, update_rate_limit_cache_loop
    import asyncio
    asyncio.create_task(background_data_fetcher())
    asyncio.create_task(update_rate_limit_cache_loop())
    asyncio.create_task(_metrics_flush_loop())
    ensure_settings_columns()
    yield
    # Best-effort final flush so the last minute of traffic is not lost on redeploy.
    try:
        await _flush_metrics()
    except Exception as e:
        logger.warning("final metrics flush failed: %s", e)

app = FastAPI(title="AgroIntel API", dependencies=[Depends(check_maintenance_mode)], lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import BackgroundTasks

@app.middleware("http")
async def api_metrics_middleware(request: Request, call_next):
    start_time = time.time()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception as e:
        logger.error(f"Unhandled error processing {request.method} {request.url.path}: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred. Please try again later."},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    finally:
        process_time_ms = int((time.time() - start_time) * 1000)
        path = request.url.path
        if path.startswith("/api/") and path not in _METRICS_SKIP_PATHS:
            logger.info(
                f"API Metrics: {request.method} {path} - {status_code} - {process_time_ms}ms"
            )
            # In-memory only. The flush loop does the single batched insert.
            if _metrics_enabled and len(_metrics_buffer) < _METRICS_BUFFER_MAX:
                _metrics_buffer.append(
                    {
                        "endpoint": path,
                        "method": request.method,
                        "response_time_ms": process_time_ms,
                        "status_code": status_code,
                    }
                )


# ── Security headers on every response ──
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()"
    # HSTS: force HTTPS for a year (the API is HTTPS-only behind Render/Cloudflare).
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Baseline CSP for the API's own responses (mostly JSON + the small HTML root).
    # Kept intentionally conservative but non-breaking: block plugins, framing and
    # <base> injection without constraining scripts/styles the app doesn't serve here.
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; "
        "img-src 'self' data:; style-src 'self' 'unsafe-inline'; form-action 'self'"
    )
    return response

# ── Catch-all handler: log full detail server-side, return clean JSON to client ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error. Please try again."})

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

# Include all modular routers
app.include_router(auth.router)
app.include_router(market.router)
app.include_router(community.router)
# ADMIN_DATA_OVERRIDE_R113
# admin_data MUST be included BEFORE admin. FastAPI matches routes in
# registration order, so this is what makes the corrected implementations of
# PATCH /api/admin/settings, /api/admin/error-stats, /api/admin/feature-usage and
# /api/admin/rate-limits take effect while their broken originals remain in the
# oversized admin.py. Moving this line below admin.router silently restores the
# old buggy behaviour.
app.include_router(admin_data.router)
app.include_router(admin.router)
app.include_router(superadmin.router)
app.include_router(ai.router)
app.include_router(ws.router)

# ── Root & Healthcheck Endpoints (supports GET & HEAD for Render/monitoring) ──
@app.api_route("/", methods=["GET", "HEAD"])
async def root_ping():
    return {"status": "ok", "service": "AgroIntel API", "version": "13.0"}

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_ping():
    from dependencies import GROQ_KEY, supabase
    return {
        "status": "ok",
        "service": "AgroIntel API",
        "groq": bool(GROQ_KEY),
        "supabase": bool(supabase),
    }

# ── Helper Endpoints that didn't fit a specific router easily ──
@app.get("/api/geocode")
async def geocode(req: Request, q: str):
    rate_limit(req, max_req=15, window=60)
    try:
        # URL-encode the user query and pass params via httpx so user input can't
        # inject extra query parameters into the Nominatim request.
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "json", "limit": 1},
                headers={"User-Agent": "KrishiAI"},
            )
        if r.status_code == 200 and r.json():
            return {"lat": float(r.json()[0]["lat"]), "lon": float(r.json()[0]["lon"])}
        return {"error": "Location not found"}
    except Exception:
        return {"error": "Geocoding failed"}

@app.post("/api/track")
async def track_feature(req: Request):
    rate_limit(req, max_req=50, window=60)
    try:
        data = await req.json()
        f = data.get("feature")
        s = data.get("status", "success")
        
        if f == "app_load":
            try:
                ip = _get_client_ip(req)
                ua = req.headers.get("user-agent", "")[:200]
                client = _metrics_client()
                if client:
                    client.table("visitors").insert({
                        "ip": ip,
                        "ua": ua,
                        "page": data.get("page", "/")
                    }).execute()
            except Exception as e:
                logger.warning(f"Failed to track visitor: {e}")

        # This endpoint is unauthenticated, so it must NOT write to the admin
        # audit_logs table (that let anonymous callers flood/poison the audit
        # trail). Emit lightweight telemetry to stdout instead.
        logger.info(f"Feature usage: feature={f} status={s}")
        return {"status": "tracked"}
    except Exception:
        return {"status": "error"}
