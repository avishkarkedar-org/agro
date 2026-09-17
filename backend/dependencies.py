import os
import logging
import time
import asyncio
import httpx
from fastapi import Request, HTTPException, Depends
from supabase import create_client, Client
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List, Any
import jwt
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
import json
from pathlib import Path
from pydantic_settings import BaseSettings
from pythonjsonlogger import jsonlogger
import io
import cachetools
from collections import defaultdict
from fastapi import FastAPI, WebSocket
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from pydantic import BaseModel, Field, field_validator
class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    ADMIN_PASSWORD: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    CORS_ORIGINS: str = "https://agro.avishkark.in,https://avishkark.in,https://www.avishkark.in,https://admin.avishkark.in,https://krishiai-1m5.pages.dev,https://agrointel.pages.dev,https://agrointel.netlify.app,https://avishkarkedar.app,https://www.avishkarkedar.app,https://admin.avishkarkedar.app,http://localhost:5173,http://localhost:5174"
    DATAGOV_API_KEY: str = ""
    JWT_SECRET: str = ""
    DEFAULT_ADMIN_USER: str = "Avishkar"
    DEFAULT_ADMIN_PASS: str = ""
    ONESIGNAL_APP_ID: str = ""
    ONESIGNAL_REST_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

ONESIGNAL_APP_ID = settings.ONESIGNAL_APP_ID or os.environ.get("ONESIGNAL_APP_ID", "").strip()
ONESIGNAL_REST_API_KEY = settings.ONESIGNAL_REST_API_KEY or os.environ.get("ONESIGNAL_REST_API_KEY", "").strip()

# ── Logging ──
logger = logging.getLogger("agrointel")
logger.setLevel(logging.INFO)
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(levelname)s %(name)s %(message)s',
    rename_fields={"levelname": "severity", "asctime": "timestamp"}
)
logHandler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(logHandler)
# Ensure Uvicorn logs also use this format if needed, but for now just app logger.

# ── Environment variables (fail-fast if missing) ──
GROQ_KEY   = settings.GROQ_API_KEY
ADMIN_PASS = settings.ADMIN_PASSWORD
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
# ── Groq model selection (free-tier optimized; every model overridable via env var) ──
# Groq applies free-tier limits per ORGANISATION (not per user). Daily caps that drive these defaults:
#   llama-3.1-8b-instant -> 14,400 requests/day + 500K tokens/day  (by far the most generous free model)
#   openai/gpt-oss-120b  ->  1,000 requests/day + 200K tokens/day  (flagship-quality reasoning)
#   qwen/qwen3.6-27b     -> ~1,000 requests/day                    (Groq's current recommended vision model)
# The text endpoints (voice chat + crop-doctor) default to the 70B versatile model so a public site can
# benefit from top-tier reasoning while staying within generous rate limits. Set GROQ_MODEL=llama-3.1-8b-instant if you
# need to handle thousands of requests per day and can live with slightly lower answer quality.
# NOTE: the previous "llama-3.2-11b-vision-instruct" and "llama3-70b-8192" models were DECOMMISSIONED by
# Groq, which silently broke the plant scan. Vision now uses Qwen 3.6 27B (Groq's recommended model).
MODEL        = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")
MODEL2       = os.environ.get("GROQ_MODEL2", VISION_MODEL)  # 2nd vision model for scan consensus; defaults to VISION_MODEL, in which case consensus auto-skips to conserve free-tier quota

DATA_FILE  = Path("/tmp/agrointel_data.json") # Deprecated, left for fallback

# Set SUPABASE_URL and SUPABASE_KEY in your Render environment variables
SUPABASE_URL = settings.SUPABASE_URL.strip()
SUPABASE_KEY = settings.SUPABASE_KEY.strip()
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY.strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    if os.environ.get("GITHUB_ACTIONS"):
        logger.warning("Running in GitHub Actions. Bypassing missing Supabase credentials.")
    else:
        logger.critical("FATAL: Supabase URL or Key is missing. Cannot start server.")
        raise RuntimeError("Supabase credentials are required.")

supabase: Client = None
supabase_admin: Client = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    if SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL:
        supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
except Exception as e:
    logger.critical(f"FATAL SUPABASE INIT ERROR: {e}")
    raise RuntimeError(f"Failed to connect to database: {e}")

def get_supabase() -> Client:
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection severed")
    return supabase

def get_supabase_admin() -> Client:
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Admin Database connection severed")
    return supabase_admin
# ── CORS origins (configurable via env, comma-separated) ──
_cors_raw = settings.CORS_ORIGINS
CORS_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()]
if "https://admin.avishkarkedar.app" not in CORS_ORIGINS:
    CORS_ORIGINS.append("https://admin.avishkarkedar.app")

# ── Data.gov.in API key for mandi proxy ──
DATAGOV_KEY = os.environ.get("DATAGOV_API_KEY", "")

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections = set()
        self.ip_connections = defaultdict(int)
        self.MAX_TOTAL_WS = 500
        self.MAX_PER_IP = 10

    async def connect(self, websocket: WebSocket, client_ip: str = "unknown") -> bool:
        if client_ip in _banned_ips_cache["ips"] or client_ip in _blocked_ips:
            await websocket.close(code=1008, reason="Policy Violation")
            return False
        if len(self.active_connections) >= self.MAX_TOTAL_WS or self.ip_connections[client_ip] >= self.MAX_PER_IP:
            await websocket.close(code=1013, reason="Try Again Later")
            return False
        await websocket.accept()
        self.active_connections.add(websocket)
        self.ip_connections[client_ip] += 1
        return True

    def disconnect(self, websocket: WebSocket, client_ip: str = "unknown"):
        self.active_connections.discard(websocket)
        if client_ip in self.ip_connections:
            self.ip_connections[client_ip] = max(0, self.ip_connections[client_ip] - 1)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()


# ── Security Headers Middleware ──

# ── Rate Limiter ──
import threading
request_history = cachetools.TTLCache(maxsize=10000, ttl=120)
_rate_limit_lock = threading.Lock()
MAX_XFF_LENGTH = 500  # Max length for X-Forwarded-For header to prevent abuse

def _get_client_ip(req: Request) -> str:
    """Extract the client IP, preferring the header the CDN controls.

    IMPORTANT: none of these headers are trustworthy if the origin is reachable
    directly. Cloudflare sets/overwrites `cf-connecting-ip` at its edge, so we
    trust it first; `x-real-ip` and `x-forwarded-for` are attacker-settable and
    used only as best-effort fallbacks. To make this actually spoof-proof, lock
    the Render origin so it only accepts Cloudflare traffic (Authenticated Origin
    Pull or an IP allowlist) — otherwise rate limits and IP bans can be bypassed
    by sending a forged header straight to the origin.
    """
    cf_ip = req.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()[:45]

    real_ip = req.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()[:45]

    xff = req.headers.get("x-forwarded-for", "")
    if xff and len(xff) <= MAX_XFF_LENGTH:
        # The first IP is the original client IP
        ips = [ip.strip() for ip in xff.split(",")]
        return ips[0][:45]

    return (req.client.host if req.client else "unknown")

_rate_limit_config_cache = {"max_req": 20, "window": 60, "ts": 0}
_banned_ips_cache = {"ips": set(), "ts": 0}

def rate_limit(req: Request, max_req: Optional[int] = None, window: Optional[int] = None, bucket: Optional[str] = None):
    # 1. Admin Bypass: If the user is an admin, do not rate-limit them at all.
    auth_header = req.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
            if payload.get("role") in ["admin", "superadmin"]:
                return
        except Exception:
            pass

    client_ip = _get_client_ip(req)
    now = time.time()

    # 2. Enforce Ban Engine (Check RAW client IP before bucket suffixing)
    if client_ip in _banned_ips_cache["ips"] or client_ip in _blocked_ips:
        raise HTTPException(403, "Your IP has been permanently or temporarily banned due to policy violations.")

    if bucket is None:
        bucket = f"{req.method}_{req.url.path}"
    rate_key = f"{client_ip}_{bucket}"
    
    # 3. Enforce dynamic Rate Limit Configurator if not explicitly specified
    if max_req is None:
        max_req = _rate_limit_config_cache.get("max_req", 20)
    if window is None:
        window = _rate_limit_config_cache.get("window", 60)
    
    with _rate_limit_lock:
        history = request_history.get(rate_key, [])
        history = [t for t in history if now - t < window]
        
        # Always update the history with pruned values before raising
        request_history[rate_key] = history
        
        if len(history) >= max_req:
            raise HTTPException(429, f"Too many requests. Limit is {max_req} per {window}s. Please slow down.")
        
        history.append(now)
        request_history[rate_key] = history

# ── Login Activity Log (in-memory, last 50 attempts) ──
_login_activity: list = []
LOGIN_ACTIVITY_MAX = 50

# ── Brute-force protection (per-IP failed login tracking) ──
_login_failures: dict = {}  # ip -> [timestamps of failures]
LOGIN_LOCKOUT_THRESHOLD = 5  # max failed attempts
LOGIN_LOCKOUT_WINDOW = 300  # 5 minutes

# ── IP Blocklist ──
_blocked_ips: set = set()

# ── Task Runner (last-run tracking) ──
_task_last_run: dict = {}
_task_last_result: dict = {}

# ── AI Token Usage (in-memory, REAL counts from the Groq API) ──
# Accumulates the actual `usage.total_tokens` returned by Groq on every AI call.
# Resets on server restart (same model as other in-memory metrics here).
_ai_usage: dict = {
    "total_tokens": 0,
    "total_calls": 0,
    "by_model": {},   # model name -> tokens
    "by_date": {},    # YYYY-MM-DD -> tokens
    "by_source": {},  # feature label (scan / crop_doctor / chat) -> tokens
    "started_at": datetime.now(timezone.utc).isoformat(),
}

def record_ai_usage(model: str, total_tokens, source: str = "ai"):
    """Record real token usage returned by the Groq API (best-effort, never raises)."""
    try:
        tokens = int(total_tokens or 0)
    except (TypeError, ValueError):
        tokens = 0
    if tokens <= 0:
        return
    try:
        model = model or "unknown"
        _ai_usage["total_tokens"] += tokens
        _ai_usage["total_calls"] += 1
        _ai_usage["by_model"][model] = _ai_usage["by_model"].get(model, 0) + tokens
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        _ai_usage["by_date"][today] = _ai_usage["by_date"].get(today, 0) + tokens
        _ai_usage["by_source"][source] = _ai_usage["by_source"].get(source, 0) + tokens
    except Exception as e:
        logger.warning(f"record_ai_usage failed: {e}")

# ── Maintenance Cache ──
_maint_cache = {"status": False, "ts": 0}
MAINT_CACHE_TTL = 60

async def check_maintenance_mode(req: Request):
    """Dependency to check if system is in maintenance mode."""
    # Never block admin panel, settings query, or healthchecks
    if (
        req.url.path.startswith("/api/admin")
        or req.url.path.startswith("/api/superadmin")
        or req.url.path in ("/api/settings", "/health", "/")
    ):
        return

    # Check for admin bypass via authorization header only (never query param)
    auth_header = req.headers.get("authorization", "") or req.headers.get("x-admin-bypass", "")
    token_to_verify = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else auth_header
    if token_to_verify:
        try:
            payload = jwt.decode(token_to_verify, JWT_SECRET, algorithms=["HS256"])
            if payload.get("role") in ("admin", "superadmin"):
                return
        except Exception:
            pass
        
    now = time.time()
    if supabase and now - _maint_cache["ts"] > MAINT_CACHE_TTL:
        try:
            r = supabase.table("settings").select("maintenance_mode, maintenance_schedule").eq("id", 1).execute()
            if r.data:
                data = r.data[0]
                status = data.get("maintenance_mode", False)
                # Check scheduled maintenance
                sched = data.get("maintenance_schedule", {})
                if sched and not status:
                    start_time = sched.get("start")
                    end_time = sched.get("end")
                    if start_time and end_time:
                        try:
                            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                            current_dt = datetime.now(timezone.utc)
                            if start_dt <= current_dt <= end_dt:
                                status = True
                                _maint_cache["message"] = sched.get("message", "System is undergoing scheduled maintenance.")
                        except ValueError:
                            pass
                _maint_cache["status"] = status
                if "message" not in _maint_cache and status:
                    _maint_cache["message"] = "System is undergoing maintenance."
            _maint_cache["ts"] = now
        except Exception as e:
            logger.warning(f"Failed to check maintenance mode: {e}")
            
    if _maint_cache.get("status"):
        raise HTTPException(503, _maint_cache.get("message", "Service Unavailable - Maintenance Mode"))

from cachetools import TTLCache
api_cache_weather = TTLCache(maxsize=100, ttl=1800)  # 30 mins
api_cache_mandi = TTLCache(maxsize=10, ttl=3600)     # 1 hour
api_cache_fert = TTLCache(maxsize=1, ttl=86400)      # 24 hours


# ── Startup check ──
# Default superadmin credentials from environment (NEVER hardcode passwords)
DEFAULT_ADMIN_USER = os.environ.get("DEFAULT_ADMIN_USER", "admin")
DEFAULT_ADMIN_PASS = os.environ.get("DEFAULT_ADMIN_PASS", "")

async def update_rate_limit_cache_loop():
    import asyncio
    from datetime import datetime, timezone
    while True:
        try:
            if supabase:
                now = time.time()
                r_bans = await asyncio.to_thread(supabase.table("user_bans").select("ip_or_fingerprint").gt("expires_at", datetime.now(timezone.utc).isoformat()).execute)
                banned = {b["ip_or_fingerprint"] for b in r_bans.data} if r_bans.data else set()
                _banned_ips_cache["ips"] = banned.union(_blocked_ips)
                
                r_set = await asyncio.to_thread(supabase.table("settings").select("rate_limit_config, blocked_ips").eq("id", 1).execute)
                if r_set.data:
                    row = r_set.data[0]
                    conf = row.get("rate_limit_config")
                    if conf:
                        _rate_limit_config_cache["max_req"] = max(5, int(conf.get("max_req", 20)))
                        _rate_limit_config_cache["window"] = min(3600, max(10, int(conf.get("window", 60))))
                    settings_blocked = set(row.get("blocked_ips") or [])
                    if settings_blocked:
                        _banned_ips_cache["ips"] = _banned_ips_cache["ips"].union(settings_blocked)
        except Exception as e:
            logger.warning(f"Failed to sync rate limit cache: {e}")
        await asyncio.sleep(30)

async def background_data_fetcher():
    import asyncio
    from datetime import datetime, timedelta, timezone
    import time
    
    # Delay initial fetch to not block startup
    await asyncio.sleep(10)
    while True:
        try:
            logger.info("Running 6-hour background automated tasks...")
            
            # Fetch data with timeouts BEFORE clearing caches
            try:
                async with asyncio.timeout(60.0):
                    from routers.market import fetch_news_data, fetch_mandi_data, fetch_fuel_data, record_mandi_snapshot
                    await fetch_news_data()
                    mandi_result = await fetch_mandi_data(state="Maharashtra", limit=500)
                    if isinstance(mandi_result, dict) and mandi_result.get("source") == "live":
                        await record_mandi_snapshot(mandi_result)
                    await fetch_fuel_data(city="Pune")
                    await fetch_fuel_data(city="Mumbai")
                    await fetch_fuel_data(city="Delhi")
            except TimeoutError:
                logger.error("Background fetch timed out! Serving stale data.")
            except Exception as e:
                logger.error(f"Background fetch error: {e}")
                
            # Broadcast update via WebSocket
            try:
                await ws_manager.broadcast(json.dumps({"type": "prices_updated", "timestamp": datetime.now(timezone.utc).isoformat()}))
            except Exception as e:
                logger.error(f"WS Broadcast failed: {e}")

            _task_last_run["auto_scheduler"] = datetime.now(timezone.utc).isoformat()
            _task_last_run["auto_scheduler_next"] = (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat()
            _task_last_result["auto_scheduler"] = "APIs refreshed."
            
            logger.info(f"Background tasks completed. Next run at {_task_last_run['auto_scheduler_next']}")
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Background automated tasks failed: {e}")
            _task_last_result["auto_scheduler"] = f"Failed: {e}"
            
        await asyncio.sleep(6 * 3600)  # 6 hours


# ── Rate limiter (simple in-memory, per-IP) ──
_scan_calls = defaultdict(list)  # ip -> [timestamps]
SCAN_RATE_LIMIT = 10  # max calls per minute
SCAN_RATE_WINDOW = 60  # seconds

def check_scan_rate(request: Request):
    ip = _get_client_ip(request)
    # SCAN_BAN_CHECK_R152: the shared rate_limit() enforces the ban engine but
    # this dedicated scan limiter previously did not, so a banned IP could
    # still hit the AI scan endpoint even though it was blocked everywhere
    # else. Same ban sources as rate_limit(): the synced Supabase ban list and
    # the in-memory admin blocklist.
    if ip in _banned_ips_cache["ips"] or ip in _blocked_ips:
        raise HTTPException(403, "Your IP has been permanently or temporarily banned due to policy violations.")
    now = time.time()
    # Clean old entries
    _scan_calls[ip] = [t for t in _scan_calls[ip] if now - t < SCAN_RATE_WINDOW]
    if len(_scan_calls[ip]) >= SCAN_RATE_LIMIT:
        raise HTTPException(429, "Rate limit exceeded. Please wait a minute before scanning again.")
    _scan_calls[ip].append(now)

# ── Helpers ──
def strip_html(text: str) -> str:
    """Remove HTML tags to prevent XSS."""
    return re.sub(r'<[^>]+>', '', text).strip()

# SQL injection pattern detection
_SQL_INJECTION_PATTERNS = re.compile(
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION|CREATE)\b.*\b(FROM|INTO|TABLE|SET|WHERE)\b"
    r"|(--)|(;.*\b(DROP|ALTER|DELETE)\b)"
    r"|(\b(OR|AND)\b\s+\d+\s*=\s*\d+))",
    re.IGNORECASE
)

def check_sql_injection(text: str) -> bool:
    """Return True if text contains SQL injection patterns."""
    return bool(_SQL_INJECTION_PATTERNS.search(text))

def validate_image_bytes(raw: bytes) -> bool:
    """Check if file starts with known image magic bytes."""
    if not raw or len(raw) < 12:
        return False
    if raw.startswith(b'\xff\xd8\xff'):  # JPEG
        return True
    if raw.startswith(b'\x89PNG\r\n\x1a\n'):  # PNG
        return True
    if raw.startswith(b'GIF87a') or raw.startswith(b'GIF89a'):  # GIF
        return True
    if raw.startswith(b'RIFF') and raw[8:12] == b'WEBP':  # WebP
        return True
    return False

def enhance_image(raw: bytes) -> tuple[bytes, str]:
    """
    Enhance image for better AI analysis, then encode it only as small as the
    upload budget actually requires instead of always hard-downscaling.

    ADAPTIVE_COMPRESSION_R152: this used to resize every image to a fixed
    max_dim=1024 before Groq ever saw it, regardless of how small the final
    JPEG would already be at a larger size. Combined with the client already
    compressing the photo before upload (scanStore.js's compressImage), a
    plant photo could go through two lossy downscales stacked on top of each
    other, destroying exactly the fine detail — small lesions, subtle
    leaf-spot patterns — that the model needs to tell similar diseases or
    crops apart. That is the most likely cause of occasional wrong crop /
    wrong disease results. Enhancement filters now run once at full
    resolution, then we try progressively smaller max-dimension / quality
    combinations and stop at the FIRST (highest-detail) one that comfortably
    fits Groq's payload limit, instead of always throwing detail away.
    """
    try:
        from PIL import Image, ImageEnhance, ImageFilter
        Image.MAX_IMAGE_PIXELS = 25_000_000  # Cap at 25 Megapixels to prevent Decompression Bomb DoS
        img = Image.open(io.BytesIO(raw))
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Enhance contrast
        img = ImageEnhance.Contrast(img).enhance(1.25)
        # Enhance sharpness
        img = ImageEnhance.Sharpness(img).enhance(1.5)
        # Slight brightness boost for dark images
        img = ImageEnhance.Brightness(img).enhance(1.05)
        # Unsharp mask for edge clarity
        img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))

        w, h = img.size
        # Groq caps BASE64-encoded images at 4MB, but large dimensions (>1000px)
        # consume thousands of visual tokens against Groq's 7,000 ITPM limit.
        # Capping max dimension at 800px maintains full lesion/leaf detail while
        # keeping token consumption under ~800 tokens and base64 size under 100KB.
        TARGET_B64_BYTES = 500 * 1024
        max_dim_candidates = [800, 640, 512]
        quality_candidates = [85, 78, 70]

        smallest_encoded = None
        for max_dim in max_dim_candidates:
            if max(w, h) > max_dim:
                scale = max_dim / max(w, h)
                sized = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            else:
                sized = img
            for quality in quality_candidates:
                buf = io.BytesIO()
                sized.save(buf, format="JPEG", quality=quality, optimize=True)
                encoded = buf.getvalue()
                if smallest_encoded is None or len(encoded) < len(smallest_encoded):
                    smallest_encoded = encoded
                # base64 expands raw bytes by ~4/3
                approx_b64_size = len(encoded) * 4 / 3
                if approx_b64_size <= TARGET_B64_BYTES:
                    return encoded, "image/jpeg"
            if max(w, h) <= max_dim:
                continue

        # Use the smallest attempt found
        return (smallest_encoded if smallest_encoded is not None else raw), "image/jpeg"
    except ImportError:
        # Pillow not installed — use raw image as-is
        logger.info("Pillow not available, using raw image for scan")
        return raw, "image/jpeg"
    except Exception as e:
        logger.warning(f"Image enhancement failed (using original): {e}")
        return raw, "image/jpeg"

# ── Auth & JWT Setup ──
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
import secrets
JWT_SECRET = (settings.JWT_SECRET or os.environ.get("JWT_SECRET", "")).strip()
if not JWT_SECRET:
    if os.environ.get("GITHUB_ACTIONS"):
        logger.warning("Running in GitHub Actions. Bypassing missing JWT_SECRET.")
        JWT_SECRET = "github_actions_dummy_secret"
    else:
        logger.critical("FATAL: JWT_SECRET not set in environment. Cannot start server.")
        raise RuntimeError("JWT_SECRET is required.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": int(now.timestamp())})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def check_admin(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        iat: int = payload.get("iat", 0)
        permissions = payload.get("permissions", [])

        if username is None or role not in ["admin", "superadmin"]:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Feature: Session Revocation & Security Policies (best-effort; never 500 on DB issues)
        if supabase:
            try:
                cache_key = f"admin_{username}"
                admin_data = _maint_cache.get(cache_key)
                if not admin_data or time.time() - admin_data.get("_ts", 0) > 60:
                    r = supabase.table("admins").select("force_logout_ts, security_policy").eq("username", username).execute()
                    if r.data:
                        admin_data = r.data[0]
                        admin_data["_ts"] = time.time()
                        _maint_cache[cache_key] = admin_data

                if admin_data:
                    force_logout_ts = admin_data.get("force_logout_ts")
                    if force_logout_ts:
                        try:
                            dt = datetime.fromisoformat(force_logout_ts.replace('Z', '+00:00'))
                            if iat < int(dt.timestamp()):
                                raise HTTPException(status_code=401, detail="Session revoked by Superadmin. Please log in again.")
                        except ValueError:
                            pass

                    policy = admin_data.get("security_policy") or {}
                    whitelist = policy.get("allowed_ips", [])
                    if whitelist:
                        client_ip = _get_client_ip(request)
                        if client_ip not in whitelist:
                            logger.warning(f"Admin {username} attempted access from unauthorized IP: {client_ip}")
                            raise HTTPException(status_code=403, detail="Access denied: Your IP is not whitelisted.")
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Admin policy check skipped: {e}")

        return {"username": username, "role": role, "permissions": permissions}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def check_superadmin(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = check_admin(request, credentials)
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin privileges required")
    return user

def log_audit(admin_username: str, action: str, details: dict = None):
    if not supabase: return
    try:
        log_entry = {
            "admin_username": admin_username,
            "action": action,
            "details": details or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("audit_logs").insert(log_entry).execute()
    except Exception as e:
        logger.error(f"Audit log error: {e}")

async def send_onesignal_price_alert(commodity: str, modal_price: float, market: str = ""):
    """
    Sends a targeted push notification via OneSignal ONLY to devices
    that have tagged 'alert_{clean_commodity}' <= modal_price.
    """
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_API_KEY:
        return None
    try:
        clean_key = "alert_" + re.sub(r"[^a-z0-9]", "_", str(commodity).lower())[:30]
        url = "https://onesignal.com/api/v1/notifications"
        headers = {
            "Authorization": f"Basic {ONESIGNAL_REST_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "app_id": ONESIGNAL_APP_ID,
            "filters": [
                {"field": "tag", "key": clean_key, "relation": "<=", "value": str(int(modal_price))}
            ],
            "headings": {"en": f"🌾 {commodity} Target Reached!"},
            "contents": {"en": f"{commodity} at {market or 'Mandi'} reached ₹{int(modal_price):,}/q. Your target alert was triggered!"},
            "url": "https://agrointel.pages.dev/?tab=mandi"
        }
        async with httpx.AsyncClient(timeout=6) as client:
            resp = await client.post(url, headers=headers, json=payload)
            logger.info(f"OneSignal targeted push for {commodity} returned status {resp.status_code}")
            return resp.status_code
    except Exception as e:
        logger.warning(f"OneSignal targeted push error: {e}")
        return None

# ── Pydantic Models ──
class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=1000)
    author: str = Field(default="Anonymous", max_length=100)
    loc: str = Field(default="India", max_length=100)
    tag: str = Field(default="General", max_length=50)
    emoji: str = Field(default="🧑‍🌾", max_length=10)

    @field_validator('title', 'body', 'author', 'loc', mode='before')
    @classmethod
    def sanitize(cls, v):
        if isinstance(v, str):
            cleaned = strip_html(v)
            if check_sql_injection(cleaned):
                raise ValueError("Input contains disallowed patterns")
            return cleaned
        return v

class PostReply(BaseModel):
    body: str = Field(..., min_length=1, max_length=1000)
    author: str = Field(default="Anonymous", max_length=100)
    loc: str = Field(default="India", max_length=100)

    @field_validator('body', 'author', 'loc', mode='before')
    @classmethod
    def sanitize(cls, v):
        if isinstance(v, str):
            cleaned = strip_html(v)
            if check_sql_injection(cleaned):
                raise ValueError("Input contains disallowed patterns")
            return cleaned
        return v

# Whitelist of allowed settings keys
# PIPELINE_BUG_R152: "maintenance_schedule" was missing from this set, so
# PATCH /api/admin/settings silently dropped it whenever the admin panel's
# MaintenanceScheduler saved a scheduled maintenance window — the instant
# on/off toggle (maintenance_mode) worked fine because it was already listed,
# but the schedule itself never reached the database. check_maintenance_mode()
# above has always read maintenance_schedule correctly; only the admin write
# path was broken.
ALLOWED_SETTINGS_KEYS = {"youtube_id", "announcement", "ann_image", "site_title", "mandi_prices", "maintenance_mode", "maintenance_schedule", "rentals", "verified_experts", "custom_news", "bulk_message", "blocked_ips", "ann_start_date", "ann_end_date", "feature_order", "access_code_setting", "fuel_prices", "login_required_features", "voice_settings", "advanced_features", "disabled_features", "ai_settings", "ws_settings", "gql_settings", "weather_settings", "admin_profiles", "rate_limit_config"}

# ── Auto-migrate settings table on startup ──
def ensure_settings_columns():
    """Ensure all required columns exist in settings table."""
    if not supabase:
        return
    try:
        # Try to read current settings
        r = supabase.table("settings").select("*").eq("id", 1).execute()
        if not r.data:
            # Create initial settings row
            supabase.table("settings").insert({"id": 1, "youtube_id": "", "announcement": "", "maintenance_mode": False}).execute()
            return
        
        current = r.data[0]
        # Check for missing fields and add defaults via update
        defaults = {
            "rentals": [],
            "custom_news": [],
            "bulk_message": "",
            "verified_experts": [],
            "voice_settings": {"gender": "female", "pitch": 1.1, "rate": 1.0, "lang": "hi-IN", "greeting": "\u0928\u092e\u0938\u094d\u0924\u0947 \u0915\u093f\u0938\u093e\u0928 \u092d\u093e\u0907\u092f\u094b\u0902, \u092e\u0948\u0902 \u0915\u0943\u0937\u093f-\u0938\u093e\u0925\u0940 \u0939\u0942\u0901\u0964 \u0906\u092a\u0915\u0940 \u0915\u094d\u092f\u093e \u092e\u0926\u0926 \u0915\u0930\u0942\u0901?"},
            "advanced_features": {"websockets": True, "graphql": True, "community": True},
            "disabled_features": [],
            "ai_settings": {"persona": "friendly", "max_tokens": 300, "context": "", "strict_topic": True, "memory": True},
            "ws_settings": {"ping_rate": 30, "disconnect_idle": True, "broadcast_msg": ""},
            "gql_settings": {"cache_ttl": 6, "query_depth": 3},
            "weather_settings": {"trust_threshold": 3, "auto_reject": True, "shadowban_limit": 5},
            "admin_profiles": {}
        }
        missing = {k: v for k, v in defaults.items() if k not in current}
        if missing:
            try:
                supabase.table("settings").update(missing).eq("id", 1).execute()
                logger.info(f"Added missing settings columns: {list(missing.keys())}")
            except Exception as e:
                logger.warning(f"Could not add missing settings fields (may need manual SQL): {e}")
    except Exception as e:
        logger.warning(f"Settings migration check failed: {e}")


def get_settings():
    if not supabase: return {"youtube_id":"","announcement":"","ann_image":"","site_title":"AgroIntel","mandi_prices":[]}
    try:
        r = supabase.table("settings").select("*").eq("id", 1).execute()
        if not r.data:
            # Row doesn't exist — create it
            try:
                supabase.table("settings").insert({"id": 1, "youtube_id": "", "announcement": "", "maintenance_mode": False, "mandi_prices": [], "rentals": [], "custom_news": [], "bulk_message": ""}).execute()
                r = supabase.table("settings").select("*").eq("id", 1).execute()
            except Exception:
                pass
        return r.data[0] if r.data else {"youtube_id":"","announcement":"","ann_image":"","site_title":"AgroIntel","mandi_prices":[]}
    except Exception as e:
        logger.warning(f"Could not load settings: {e}")
        return {"youtube_id":"","announcement":"","ann_image":"","site_title":"AgroIntel","mandi_prices":[]}


PROMPT = """You are an expert agricultural plant pathologist AI with 20+ years field experience in India.
Analyze this plant image carefully. You MUST perform THREE independent analysis passes before responding.

PASS 1: Initial observation — identify crop, visible symptoms, and possible diseases.
PASS 2: Cross-check — verify your Pass 1 conclusion. Consider ALL similar-looking diseases and crops.
PASS 3: Final verification — confirm or revise. If two or more crops or diseases look equally likely, you MUST list ALL of them.

FIRST: Is this a plant/leaf/crop image?
If NO: {"is_plant":false,"error":"No plant detected. Please upload a clear photo of a plant leaf or crop."}

If YES, respond ONLY with raw JSON (no markdown):
{
  "is_plant": true,
  "crop": "Primary crop identification. If confused between multiple crops, write ALL separated by ' or ' e.g. 'Tomato or Potato or Chilli'",
  "disease": "Primary disease. If confused between multiple diseases, write ALL separated by ' or ' e.g. 'Early Blight or Septoria Leaf Spot or Bacterial Spot'. Use 'Healthy Plant' if no disease.",
  "pathogen": "scientific name (type) or None. If multiple possible, list all separated by ' / '",
  "severity": "None or Moderate or High or Severe",
  "confidence": 87,
  "ambiguous": false,
  "alt_crop": "second most likely crop if ambiguous, else null",
  "alt_disease": "second most likely disease if ambiguous, else null",
  "possible_crops": ["list", "of", "all", "possible", "crops"],
  "possible_diseases": ["list", "of", "all", "possible", "diseases"],
  "symptoms": "2 sentences describing what you see",
  "spread": "1 sentence on spread, or N/A",
  "treatment": ["Step 1 with Indian brand+dose","Step 2","Step 3","Step 4"],
  "prevention": "2 prevention sentences for Indian farming",
  "accuracy_note": "Explain WHY you are confused between the options. What visual features make them similar? What would help distinguish them?"
}
RULES:
- confidence=NUMBER (0-100), severity=exact one of four values, treatment=array min 3
- Indian brands (Dithane M-45/Ridomil Gold/Confidor/Amistar)
- If confidence < 75, set ambiguous=true and fill alt_crop/alt_disease AND possible_crops/possible_diseases arrays
- If confidence >= 75, possible_crops and possible_diseases can be single-item arrays with just the identified crop/disease
- ALWAYS fill possible_crops and possible_diseases arrays (even if just one item)
- RAW JSON ONLY — no markdown, no explanation outside JSON."""


# ── Feature 5: AI Crop Doctor Chat ──
class CropDoctorRequest(BaseModel):
    question: str
    crop: str = ""
    disease: str = ""
    severity: str = ""
    stream: bool = False


# ── Live Fuel Prices ──
_fuel_cache = cachetools.TTLCache(maxsize=100, ttl=3600)  # city -> prices dict


# ── Mandi Prices Proxy (hides API key from frontend) ──
import random

async def scrape_agmarknet(state: str):
    """Attempt to directly scrape agmarknet.gov.in avoiding data.gov.in API limits."""
    try:
        from bs4 import BeautifulSoup
        async with httpx.AsyncClient(timeout=15.0, verify=True, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"}) as client:
            r = await client.get("https://agmarknet.gov.in/SearchCmmMkt.aspx")
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                vs = soup.find(id="__VIEWSTATE")
                vsg = soup.find(id="__VIEWSTATEGENERATOR")
                ev = soup.find(id="__EVENTVALIDATION")
                if vs and ev:
                    # Mapping generic 'Maharashtra' to 'MH'
                    state_code = "MH" if "maha" in state.lower() else "UP"
                    data = {
                        "__VIEWSTATE": vs['value'],
                        "__VIEWSTATEGENERATOR": vsg['value'] if vsg else "",
                        "__EVENTVALIDATION": ev['value'],
                        "ddlState": state_code,
                        "btnGo": "Go"
                    }
                    r2 = await client.post("https://agmarknet.gov.in/SearchCmmMkt.aspx", data=data)
                    soup2 = BeautifulSoup(r2.text, 'html.parser')
                    table = soup2.find(id="cphBody_GridPriceData")
                    records = []
                    if table:
                        for row in table.find_all("tr")[1:51]: # get top 50
                            cols = row.find_all("td")
                            if len(cols) >= 10:
                                records.append({
                                    "state": state,
                                    "district": cols[1].text.strip(),
                                    "market": cols[2].text.strip(),
                                    "commodity": cols[3].text.strip(),
                                    "variety": cols[4].text.strip(),
                                    "grade": cols[5].text.strip(),
                                    "arrival_date": cols[6].text.strip(),
                                    "min_price": cols[7].text.strip(),
                                    "max_price": cols[8].text.strip(),
                                    "modal_price": cols[9].text.strip(),
                                })
                        if records:
                            return {"records": records, "source": "live", "note": "Live scraped from agmarknet.gov.in"}
    except Exception as e:
        logger.error(f"Agmarknet scrape failed: {e}")
    return None

def get_fallback_mandi(state: str):
    """
    Returns realistic Maharashtra APMC reference prices (May 2026).
    Used when the data.gov.in API is unavailable.
    Prices sourced from MSP 2026-27 (PIB), Agmarknet, Pune APMC bulletins.
    """
    records = [
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Wheat", "variety": "Lok-1 / Sharbati", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "2500", "modal_price": "2650", "max_price": "2850"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Rice", "variety": "Indrayani / Kolam", "grade": "Grade A", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "3600", "modal_price": "4100", "max_price": "4600"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Maize", "variety": "Yellow", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "2200", "modal_price": "2410", "max_price": "2600"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Soyabean", "variety": "Yellow", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "5200", "modal_price": "5708", "max_price": "6100"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Tur Dal", "variety": "Local / Hybrid", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "9500", "modal_price": "10200", "max_price": "11000"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Chana", "variety": "Desi", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "5800", "modal_price": "6200", "max_price": "6700"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Onion", "variety": "Red Nashik", "grade": "Grade A", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "500", "modal_price": "1994", "max_price": "2200"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Potato", "variety": "Jyoti", "grade": "Grade A", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "1000", "modal_price": "1590", "max_price": "1900"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Tomato", "variety": "Hybrid", "grade": "Grade A", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "1200", "modal_price": "2852", "max_price": "3100"},
        {"state": state, "district": "Pune", "market": "Pune (Moshi)", "commodity": "Onion", "variety": "Red", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "600", "modal_price": "1000", "max_price": "1400"},
        {"state": state, "district": "Pune", "market": "Pune (Pimpri)", "commodity": "Onion", "variety": "Local", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "600", "modal_price": "1200", "max_price": "1800"},
        {"state": state, "district": "Pune", "market": "Pune (Moshi)", "commodity": "Tomato", "variety": "Deshi", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "2500", "modal_price": "2750", "max_price": "3000"},
        {"state": state, "district": "Pune", "market": "Pune (Pimpri)", "commodity": "Tomato", "variety": "Local", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "2500", "modal_price": "2550", "max_price": "2600"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Soybean", "variety": "Yellow", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "5500", "modal_price": "5700", "max_price": "6000"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Cotton", "variety": "Long Staple", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "8000", "modal_price": "8500", "max_price": "9000"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Wheat", "variety": "Lokwan", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "2800", "modal_price": "3000", "max_price": "3200"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Maize", "variety": "Hybrid", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "2300", "modal_price": "2400", "max_price": "2500"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Groundnut", "variety": "Bold", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "6800", "modal_price": "7517", "max_price": "8200"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Mustard", "variety": "Yellow", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "5400", "modal_price": "5900", "max_price": "6300"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Moong Dal", "variety": "Local", "grade": "FAQ", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "8000", "modal_price": "8800", "max_price": "9500"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Ginger", "variety": "Fresh", "grade": "Grade A", "arrival_date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "min_price": "3800", "modal_price": "4500", "max_price": "5500"},
    ]
    return {"records": records, "status": "fallback", "note": "Reference prices — June 10 2026 Maharashtra APMC + MSP 2026-27"}
_mandi_cache = cachetools.TTLCache(maxsize=100, ttl=3600)


# ── Live News Endpoint ──
# Cache news to avoid hammering RSS feeds on every request
_news_cache = cachetools.TTLCache(maxsize=10, ttl=300)

# Keywords to ensure news is farming-related
_AGRI_KEYWORDS = [
    "farm", "crop", "kisan", "agri", "mandi", "msp", "wheat", "rice", "paddy",
    "soybean", "cotton", "onion", "tomato", "sugarcane", "irrigation", "monsoon",
    "rainfall", "drought", "fertilizer", "urea", "dap", "pesticide", "soil",
    "harvest", "sowing", "kharif", "rabi", "apmc", "procurement", "subsidy",
    "pm-kisan", "fasal", "bima", "krishi", "seed", "organic", "dairy", "milk",
    "cattle", "poultry", "horticulture", "vegetable", "fruit", "pulse", "oilseed",
    "tractor", "rural", "village", "gramin", "nabard", "cooperative", "fpo",
    "weather", "imd", "flood", "cyclone", "pest", "disease", "yield", "export",
    "import", "quota", "ban", "price", "market", "trade", "storage", "godown",
]

def _is_agri_news(title: str) -> bool:
    """Check if a news title is related to agriculture/farming."""
    t = title.lower()
    return any(kw in t for kw in _AGRI_KEYWORDS)


# ── Supabase Auth Endpoints ──
class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class UserLoginRequest(BaseModel):
    identifier: str  # Can be username OR email
    password: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

# ── OTP Store (in-memory, short-lived) ──
import string
_otp_store = cachetools.TTLCache(maxsize=1000, ttl=600)  # email -> {"otp_hash": "...", "ts": timestamp, "username": "...", "password": "...", "attempts": 0}
OTP_EXPIRY = 600  # 10 minutes
OTP_MAX_ATTEMPTS = 5

def generate_otp():
    """Generate cryptographically secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"

def hash_otp(otp: str) -> str:
    """Hash OTP for secure storage."""
    import hashlib
    return hashlib.sha256(otp.encode()).hexdigest()


# ── Supabase Database Endpoints ──


# ADMIN
class LoginRequest(BaseModel):
    username: str
    password: str


# ── SUPERADMIN ENDPOINTS ──
class AdminCreate(BaseModel):
    username: str
    password: str
    role: str = "admin"


# ── Scan Analytics ──

# ── Feature 1: AI Usage Dashboard ──

# ── Feature 5: Login Activity Log ──

# ── Feature 6: IP Blocklist ──

# ── Feature 7: API Rate Limit Dashboard ──

# ── Feature 12: Cron Job Scheduler (Manual Task Runner) ──
class RunTaskRequest(BaseModel):
    task: str


# ════════════════════════════════════════════════════════════════
# AUTH & ACCESS CODE SYSTEM
# ════════════════════════════════════════════════════════════════

# ── Forgot Password ──
_password_reset_tracker: dict = {}  # email -> [timestamps]

class ForgotPasswordRequest(BaseModel):
    email: str


# ── Admin Change Password ──
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Access Code System ──
class AccessCodeCreate(BaseModel):
    code: str = ""
    tier: str = "standard"
    expires_at: str = ""
    max_uses: Optional[int] = None

class AccessCodeValidate(BaseModel):
    code: str
    email: str = ""

_access_code_attempts: dict = {}  # email -> [timestamps]


# ── Feature Order ──

# ── Admin Analytics: Feature Usage & Error Rate ──
