"""ADMIN_DATA_R113

Corrected implementations of four admin endpoints.

WHY THIS FILE EXISTS
--------------------
These handlers already exist in routers/admin.py, but that file is ~1,050 lines
and cannot be rewritten safely with the tooling available (whole-file pushes
truncate silently past roughly 750 lines, and admin.py holds login plus every
settings write). Re-implementing here and registering this router BEFORE
admin.router in main.py makes these versions win, because FastAPI matches routes
in registration order.

FOLLOW-UP REQUIRED
------------------
The original definitions of these four paths in routers/admin.py are now
unreachable dead code:

    PATCH /api/admin/settings
    GET   /api/admin/error-stats
    GET   /api/admin/feature-usage
    GET   /api/admin/rate-limits

Delete them from admin.py when that file is split into smaller modules. Until
then, do NOT edit them expecting a behaviour change - nothing calls them.
"""

from fastapi import APIRouter, Request, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import json

from dependencies import (
    supabase,
    supabase_admin,
    check_admin,
    log_audit,
    ALLOWED_SETTINGS_KEYS,
    strip_html,
    logger,
    _maint_cache,
)

router = APIRouter()

# Keys that are sanitised before being stored.
_HTML_SANITISED_KEYS = ("announcement", "site_title")

# Feature buckets for /api/admin/feature-usage, matched by endpoint PREFIX.
# The old implementation used substring tests that missed /api/scan entirely,
# so the app's flagship feature never appeared in the usage report.
_FEATURE_BUCKETS = (
    ("Plant Scan", "\U0001F52C", ("/api/scan",)),
    ("Crop Doctor", "\U0001F33F", ("/api/crop-doctor", "/api/chat")),
    ("Mandi Prices", "\U0001F4C8", ("/api/mandi",)),
    ("Weather", "\u2600\uFE0F", ("/api/weather",)),
    ("Community", "\U0001F465", ("/api/posts",)),
    ("News", "\U0001F4F0", ("/api/news",)),
    ("Fuel Prices", "\u26FD", ("/api/fuel",)),
)

# Admin traffic is not farmer feature usage.
_EXCLUDED_PREFIXES = ("/api/admin/", "/api/superadmin")


def _client():
    """Prefer the service-role client. It bypasses RLS, which is what makes
    settings writes actually land."""
    return supabase_admin or supabase


def _as_int(value, default=0):
    try:
        if isinstance(value, bool):
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


# ────────────────────────────────────────────────────────────────────────
# Settings write, with verification
#
# An RLS-denied UPDATE in Postgres is not an error - it affects zero rows and
# returns success. That is exactly how admin panel saves could report "Saved!"
# while the website never changed. Verify the write instead of trusting it.
# ────────────────────────────────────────────────────────────────────────
@router.patch("/api/admin/settings")
async def update_settings_verified(request: Request, user: dict = Depends(check_admin)):
    client = _client()
    if client is None:
        raise HTTPException(503, "Database not configured.")

    try:
        body = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON body.")

    if not isinstance(body, dict):
        raise HTTPException(400, "Request body must be a JSON object.")

    filtered = {k: v for k, v in body.items() if k in ALLOWED_SETTINGS_KEYS}
    rejected = [k for k in body.keys() if k not in ALLOWED_SETTINGS_KEYS]

    if not filtered:
        detail = "No valid settings keys provided."
        if rejected:
            detail += " Not a saveable setting: " + ", ".join(sorted(rejected)) + "."
        raise HTTPException(400, detail)

    if rejected:
        logger.warning(
            "update_settings: ignoring unknown key(s) %s from %s",
            sorted(rejected),
            user.get("username"),
        )

    for key in _HTML_SANITISED_KEYS:
        if key in filtered and isinstance(filtered[key], str):
            filtered[key] = strip_html(filtered[key])

    # Snapshot the previous state. Best effort: never block a save on history.
    try:
        current = client.table("settings").select("*").eq("id", 1).execute()
        if current.data:
            client.table("settings_history").insert(
                {
                    "changed_by": user.get("username", "unknown"),
                    "old_settings": current.data[0],
                    "changed_at": datetime.now(timezone.utc).isoformat(),
                }
            ).execute()
    except Exception as e:
        logger.warning("Settings history snapshot failed: %s", e)

    try:
        result = client.table("settings").update(filtered).eq("id", 1).execute()
    except Exception as e:
        logger.error("Settings update raised: %s", e)
        raise HTTPException(500, f"Could not save settings: {e}")

    rows = result.data or []

    # No rows updated: either the row is missing, or the write was refused.
    if not rows:
        try:
            insert_payload = dict(filtered)
            insert_payload["id"] = 1
            result = client.table("settings").insert(insert_payload).execute()
            rows = result.data or []
        except Exception as e:
            logger.error("Settings insert fallback failed: %s", e)
            rows = []

    if not rows:
        # THIS is the case that used to return 200 and lie to the admin.
        logger.error(
            "Settings write affected ZERO rows for keys %s - refusing to report success",
            list(filtered.keys()),
        )
        raise HTTPException(
            500,
            "The database accepted the request but changed nothing, so this "
            "setting would not have reached the website. This is usually a "
            "row-level security policy blocking writes to the settings table, or "
            "a missing SUPABASE_SERVICE_ROLE_KEY. Run setup_database.sql on the "
            "Supabase project and try again.",
        )

    _maint_cache["ts"] = 0
    log_audit(user["username"], "update_settings", {"keys": list(filtered.keys())})
    return rows[0]


# ────────────────────────────────────────────────────────────────────────
# Error stats, in the shape the page actually reads
# ────────────────────────────────────────────────────────────────────────
@router.get("/api/admin/error-stats")
def error_stats_full(user: dict = Depends(check_admin)):
    empty = {
        "total": 0,
        "errors": 0,
        "low_confidence": 0,
        "error_rate": 0,
        "by_day": {},
        "recent_errors": [],
    }
    client = _client()
    if client is None:
        return empty

    rows = []
    try:
        r = (
            client.table("scan_logs")
            .select("confidence, created_at")
            .order("created_at", desc=True)
            .limit(5000)
            .execute()
        )
        rows = r.data or []
    except Exception as e:
        logger.warning("error-stats: could not read scan_logs: %s", e)

    total = 0
    errors = 0
    low_confidence = 0
    per_day = {}

    for row in rows:
        confidence = _as_int(row.get("confidence"), 0)
        day = (row.get("created_at") or "")[:10]
        if not day:
            continue
        bucket = per_day.setdefault(day, {"total": 0, "errors": 0})
        bucket["total"] += 1
        total += 1
        if confidence <= 0:
            errors += 1
            bucket["errors"] += 1
        elif confidence < 50:
            low_confidence += 1

    # The frontend does Object.keys(by_day).slice(0, 7) and relies on insertion
    # order, so emit the seven most recent days oldest-first.
    recent_days = sorted(per_day.keys())[-7:]
    by_day = {day: per_day[day] for day in recent_days}

    recent_errors = []
    try:
        r2 = (
            client.table("api_metrics")
            .select("ts, endpoint, status_code")
            .gte("status_code", 400)
            .order("ts", desc=True)
            .limit(50)
            .execute()
        )
        for e in r2.data or []:
            recent_errors.append(
                {
                    "time": e.get("ts"),
                    "endpoint": e.get("endpoint"),
                    "error": "HTTP " + str(e.get("status_code")),
                    "count": 1,
                }
            )
    except Exception as e:
        logger.warning("error-stats: could not read api_metrics: %s", e)

    return {
        "total": total,
        "errors": errors,
        "low_confidence": low_confidence,
        "error_rate": round(errors * 100 / total, 1) if total else 0,
        "by_day": by_day,
        "recent_errors": recent_errors,
        "note": "Scan outcomes from scan_logs (newest 5000). HTTP errors from api_metrics.",
    }


# ────────────────────────────────────────────────────────────────────────
# Feature usage, including the scan feature that was previously uncounted
# ────────────────────────────────────────────────────────────────────────
@router.get("/api/admin/feature-usage")
def feature_usage_fixed(user: dict = Depends(check_admin)):
    counts = {name: 0 for name, _icon, _prefixes in _FEATURE_BUCKETS}
    client = _client()

    if client is not None:
        try:
            r = (
                client.table("api_metrics")
                .select("endpoint")
                .order("ts", desc=True)
                .limit(10000)
                .execute()
            )
            for metric in r.data or []:
                endpoint = metric.get("endpoint") or ""
                if any(endpoint.startswith(p) for p in _EXCLUDED_PREFIXES):
                    continue
                for name, _icon, prefixes in _FEATURE_BUCKETS:
                    if any(endpoint.startswith(p) for p in prefixes):
                        counts[name] += 1
                        break
        except Exception as e:
            logger.warning("feature-usage: could not read api_metrics: %s", e)

    return {
        "features": [
            {"name": name, "usage": counts[name], "icon": icon}
            for name, icon, _prefixes in _FEATURE_BUCKETS
        ],
        "note": "Counted from the newest 10000 api_metrics rows. Admin traffic excluded.",
    }


# ────────────────────────────────────────────────────────────────────────
# Rate limits - without querying a column that does not exist
# ────────────────────────────────────────────────────────────────────────
@router.get("/api/admin/rate-limits")
def rate_limits_fixed(user: dict = Depends(check_admin)):
    limits = {"max_req": 20, "window": 60}
    top_endpoints = []
    requests_last_5min = 0
    client = _client()

    if client is not None:
        try:
            r = client.table("settings").select("rate_limit_config").eq("id", 1).execute()
            if r.data and r.data[0].get("rate_limit_config"):
                cfg = r.data[0]["rate_limit_config"]
                limits = {
                    "max_req": _as_int(cfg.get("max_req"), 20),
                    "window": _as_int(cfg.get("window"), 60),
                }
        except Exception as e:
            logger.warning("rate-limits: could not read rate_limit_config: %s", e)

        try:
            five_min_ago = (
                datetime.now(timezone.utc) - timedelta(minutes=5)
            ).isoformat()
            rec = (
                client.table("api_metrics")
                .select("endpoint, ts")
                .gte("ts", five_min_ago)
                .order("ts", desc=True)
                .limit(5000)
                .execute()
            )
            rows = rec.data or []
            requests_last_5min = len(rows)
            counts = {}
            last_seen = {}
            for metric in rows:
                endpoint = metric.get("endpoint") or "unknown"
                counts[endpoint] = counts.get(endpoint, 0) + 1
                if endpoint not in last_seen:
                    last_seen[endpoint] = metric.get("ts", "")
            top_endpoints = [
                {
                    "endpoint": endpoint,
                    "requests_last_5min": count,
                    "last_seen": last_seen.get(endpoint, ""),
                }
                for endpoint, count in sorted(
                    counts.items(), key=lambda kv: kv[1], reverse=True
                )[:20]
            ]
        except Exception as e:
            logger.warning("rate-limits: could not read api_metrics: %s", e)

    return {
        "limits": limits,
        # Kept for SystemHealth.jsx, which expects this key to exist.
        "top_ips": [],
        "top_ips_note": (
            "Per-IP traffic is unavailable: the api_metrics table has no "
            "ip_address column. The previous implementation selected it anyway, "
            "which raised on every call and was silently swallowed. Add an "
            "ip_address column to api_metrics to enable this table."
        ),
        "top_endpoints": top_endpoints,
        "requests_last_5min": requests_last_5min,
    }
