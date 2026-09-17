from fastapi import APIRouter, Request, HTTPException, Depends, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import json
import httpx
import time
import os
from collections import Counter
import csv
from io import StringIO
from dependencies import (
    supabase, supabase_admin, rate_limit, check_admin, log_audit,
    _get_client_ip, _login_failures, LOGIN_LOCKOUT_WINDOW,
    LOGIN_LOCKOUT_THRESHOLD, _login_activity, LOGIN_ACTIVITY_MAX,
    ADMIN_PASS, create_access_token, verify_password, get_password_hash,
    ALLOWED_SETTINGS_KEYS, strip_html, get_settings, logger,
    ChangePasswordRequest
)

router = APIRouter()

_PROCESS_START = time.time()

class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/api/admin/login")
def admin_login(req: LoginRequest, request: Request):
    try:
        username = req.username.strip() if req.username else ""
        password = req.password.strip() if req.password else ""
        if len(password) > 72:
            password = password[:72]

        ip = _get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")[:120]

        now = time.time()
        failures = _login_failures.get(ip, [])
        failures = [t for t in failures if now - t < LOGIN_LOCKOUT_WINDOW]
        _login_failures[ip] = failures
        if len(failures) >= LOGIN_LOCKOUT_THRESHOLD:
            raise HTTPException(429, f"Too many failed login attempts. Try again in {int(LOGIN_LOCKOUT_WINDOW - (now - failures[0]))} seconds.")

        def _log_login(success: bool):
            entry = {
                "username": username,
                "success": success,
                "ip": ip,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "user_agent": user_agent
            }
            _login_activity.insert(0, entry)
            if len(_login_activity) > LOGIN_ACTIVITY_MAX:
                _login_activity.pop()
            if supabase:
                try:
                    supabase.table("login_activity").insert(entry).execute()
                except Exception:
                    pass
            if not success:
                _login_failures.setdefault(ip, []).append(time.time())

        expected_admin_user = os.environ.get("DEFAULT_ADMIN_USER", "Avishkar")
        import hmac
        # Constant-time comparison to prevent timing attacks
        if ADMIN_PASS and hmac.compare_digest(password.encode(), ADMIN_PASS.encode()) and hmac.compare_digest(username.encode(), expected_admin_user.encode()):
            _log_login(True)
            _login_failures.pop(ip, None)
            access_token = create_access_token(data={"sub": username or "admin", "role": "superadmin"})
            return {"access_token": access_token, "token_type": "bearer", "role": "superadmin"}

        if not supabase:
            _log_login(False)
            raise HTTPException(401, "Invalid username or password")

        r = supabase.table("admins").select("*").eq("username", username).execute()
        if not r.data:
            _log_login(False)
            raise HTTPException(401, "Invalid username or password")

        user = r.data[0]

        password_ok = False
        try:
            password_ok = verify_password(password, user["password_hash"])
        except Exception:
            pass

        if not password_ok:
            _log_login(False)
            raise HTTPException(401, "Invalid username or password")

        settings = get_settings()
        admin_profiles = settings.get("admin_profiles", {})
        profile = admin_profiles.get(user["username"], {})

        if profile.get("is_suspended") and user["role"] != "superadmin":
            _log_login(False)
            raise HTTPException(403, "Your account has been suspended by an administrator.")

        profile["last_login_at"] = datetime.now(timezone.utc).isoformat()
        profile["last_login_ip"] = ip
        admin_profiles[user["username"]] = profile
        try:
            supabase.table("settings").update({"admin_profiles": admin_profiles}).eq("id", 1).execute()
        except Exception as e:
            logger.warning(f"Could not persist admin_profiles: {e}")

        _log_login(True)
        _login_failures.pop(ip, None)

        permissions = profile.get("allowed_permissions", [])
        access_token = create_access_token(data={"sub": user["username"], "role": user["role"], "permissions": permissions})
        return {"access_token": access_token, "token_type": "bearer", "role": user["role"], "permissions": permissions}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login crash: {type(e).__name__}: {e}")
        raise HTTPException(500, "Login failed due to a server error. Please try again.")

@router.get("/api/admin/me")
def get_me(user: dict = Depends(check_admin)):
    return user

@router.delete("/api/admin/posts/{post_id}")
def delete_post(post_id: int, user: dict = Depends(check_admin)):
    if not supabase: raise HTTPException(503, "Database not configured.")
    supabase.table("posts").delete().eq("id", post_id).execute()
    log_audit(user["username"], "delete_post", {"post_id": post_id})
    return {"deleted": post_id}

@router.delete("/api/admin/posts")
def delete_all_posts(user: dict = Depends(check_admin)):
    if not supabase: raise HTTPException(503, "Database not configured.")
    supabase.table("posts").delete().neq("id", 0).execute()
    log_audit(user["username"], "delete_all_posts")
    return {"deleted_count": "all"}

@router.get("/api/admin/settings")
def get_admin_settings(user: dict = Depends(check_admin)):
    if not supabase: raise HTTPException(503, "Database not configured.")
    r = supabase.table("settings").select("*").eq("id", 1).execute()
    if not r.data: return {}
    return r.data[0]

@router.patch("/api/admin/settings")
async def update_settings(request: Request, user: dict = Depends(check_admin)):
    if not supabase: raise HTTPException(503, "Database not configured.")
    try:
        body = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON body.")

    filtered = {k: v for k, v in body.items() if k in ALLOWED_SETTINGS_KEYS}
    if not filtered:
        raise HTTPException(400, "No valid settings keys provided.")

    if "announcement" in filtered and isinstance(filtered["announcement"], str):
        filtered["announcement"] = strip_html(filtered["announcement"])
    if "site_title" in filtered and isinstance(filtered["site_title"], str):
        filtered["site_title"] = strip_html(filtered["site_title"])

    try:
        current = supabase.table("settings").select("*").eq("id", 1).execute()
        if current.data:
            supabase.table("settings_history").insert({
                "changed_by": user["username"],
                "old_settings": current.data[0],
                "changed_at": datetime.now(timezone.utc).isoformat()
            }).execute()
    except Exception as e:
        logger.warning(f"Settings history snapshot failed (table may not exist): {e}")

    r = supabase.table("settings").update(filtered).eq("id", 1).execute()
    if not r.data:
        filtered["id"] = 1
        r = supabase.table("settings").insert(filtered).execute()
    log_audit(user["username"], "update_settings", {"keys": list(filtered.keys())})
    return r.data[0] if r.data else filtered

@router.post("/api/admin/settings/snapshot")
def create_settings_snapshot(user: dict = Depends(check_admin)):
    r = supabase.table("settings").select("*").eq("id", 1).execute()
    if r.data:
        supabase.table("settings_history").insert({
            "changed_by": user["username"],
            "old_settings": r.data[0],
            "changed_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        log_audit(user["username"], "settings_snapshot")
    return {"ok": True}

@router.get("/api/admin/settings/history")
def get_settings_history(user: dict = Depends(check_admin)):
    r = supabase.table("settings_history").select("*").order("id", desc=True).limit(20).execute()
    return {"history": r.data}

@router.post("/api/admin/settings/restore/{history_id}")
def restore_settings(history_id: int, user: dict = Depends(check_admin)):
    r = supabase.table("settings_history").select("old_settings").eq("id", history_id).execute()
    if not r.data:
        raise HTTPException(404, "History not found")
    old_settings = r.data[0]["old_settings"]
    if "id" in old_settings:
        del old_settings["id"]
    supabase.table("settings").update(old_settings).eq("id", 1).execute()
    log_audit(user["username"], "settings_restore", {"history_id": history_id})
    return {"ok": True, "message": "Settings restored"}

@router.get("/api/admin/stats")
def get_stats(user: dict = Depends(check_admin)):
    if not supabase: return {}
    try:
        posts_res = supabase.table("posts").select("*").execute()
        posts = posts_res.data
        return {
            "total_posts": len(posts),
            "total_likes": sum(p.get("likes",0) for p in posts),
            "tags": {t:sum(1 for p in posts if p.get("tag")==t) for t in set(p.get("tag","General") for p in posts)},
            "recent_posts": sorted(posts, key=lambda x: x["ts"], reverse=True)[:5]
        }
    except Exception:
        return {}

@router.get("/api/admin/visitors")
def get_visitors(user: dict = Depends(check_admin)):
    if not supabase: return {}
    try:
        vis_res = supabase.table("visitors").select("*").order("id", desc=True).limit(2000).execute()
        visitors = vis_res.data
        unique_ips = list(set(v.get("ip","") for v in visitors if v.get("ip")))
        by_date={}
        for v in visitors:
            d = v.get("time","")[:10]
            by_date[d] = by_date.get(d,0) + 1
        ip_counts = Counter(v.get("ip") for v in visitors if v.get("ip"))
        top_ips = [{"ip": ip, "visits": count} for ip, count in ip_counts.most_common(20)]
        return {
            "total_visits": len(visitors),
            "unique_visitors": len(unique_ips),
            "by_date": by_date,
            "recent": visitors[:100],
            "top_ips": top_ips
        }
    except Exception:
        return {}

@router.get("/api/admin/export")
def export_csv(type: str = "visitors", user: dict = Depends(check_admin)):
    if type not in ["visitors", "posts", "app_users", "scan_logs"]:
        raise HTTPException(400, "Invalid export type. Allowed: visitors, posts, users, scan_logs")
    if type == "app_users":
        if not supabase_admin:
            raise HTTPException(503, "SUPABASE_SERVICE_ROLE_KEY not configured")
        try:
            auth_resp = supabase_admin.auth.admin.list_users()
            data = [{"email": u.email, "created_at": str(u.created_at), "last_sign_in": str(u.last_sign_in_at)} for u in auth_resp.users]
        except Exception as e:
            raise HTTPException(500, f"Failed to export users: {e}")
    else:
        r = supabase.table(type).select("*").execute()
        data = r.data
    if not data:
        return Response("No data found", media_type="text/plain")
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    log_audit(user["username"], "export_csv", {"type": type})
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={type}_export.csv"}
    )

class BanCreate(BaseModel):
    ip_or_fingerprint: str
    reason: str = "Violation of terms"
    days: int = 7

@router.get("/api/admin/bans")
def get_bans(user: dict = Depends(check_admin)):
    if not supabase: return {"bans": []}
    r = supabase.table("user_bans").select("*").order("created_at", desc=True).execute()
    return {"bans": r.data}

@router.post("/api/admin/bans")
def create_ban(ban: BanCreate, user: dict = Depends(check_admin)):
    if not supabase: raise HTTPException(500, "Database error")
    expires_at = (datetime.now(timezone.utc) + timedelta(days=ban.days)).isoformat()
    try:
        supabase.table("user_bans").insert({
            "ip_or_fingerprint": ban.ip_or_fingerprint,
            "reason": ban.reason,
            "expires_at": expires_at
        }).execute()
        log_audit(user["username"], "create_ban", {"ip": ban.ip_or_fingerprint, "days": ban.days})
        return {"ok": True, "message": f"Banned {ban.ip_or_fingerprint} for {ban.days} days."}
    except Exception as e:
        logger.error(f"Ban error: {e}")
        raise HTTPException(500, "Failed to create ban")

@router.delete("/api/admin/bans/{ban_id}")
def delete_ban(ban_id: int, user: dict = Depends(check_admin)):
    if not supabase: raise HTTPException(500, "Database error")
    supabase.table("user_bans").delete().eq("id", ban_id).execute()
    log_audit(user["username"], "delete_ban", {"ban_id": ban_id})
    return {"ok": True}

@router.get("/api/admin/bugs")
def get_bugs(user: dict = Depends(check_admin)):
    if not supabase: return {"bugs": []}
    r = supabase.table("bug_reports").select("*").order("created_at", desc=True).execute()
    return {"bugs": r.data}

class BugUpdate(BaseModel):
    status: str

@router.patch("/api/admin/bugs/{bug_id}")
def update_bug_status(bug_id: int, req: BugUpdate, user: dict = Depends(check_admin)):
    if not supabase: raise HTTPException(500, "Database error")
    supabase.table("bug_reports").update({"status": req.status}).eq("id", bug_id).execute()
    log_audit(user["username"], "update_bug_status", {"bug_id": bug_id, "status": req.status})
    return {"ok": True}

@router.get("/api/admin/metrics/heatmap")
def get_api_heatmap(user: dict = Depends(check_admin)):
    if not supabase: return {"heatmap": []}
    r = supabase.table("api_metrics").select("endpoint, method, ts").order("ts", desc=True).limit(5000).execute()
    return {"data": r.data if r.data else []}

@router.get("/api/admin/fetch-ndtv-fuel")
async def force_fetch_fuel(user: dict = Depends(check_admin)):
    from routers.market import fetch_fuel_data
    if not supabase: raise HTTPException(500, "Database error")
    cities = ["Pune", "Mumbai", "Delhi"]
    results = {}
    for city in cities:
        try:
            data = await fetch_fuel_data(city)
            results[city] = data
        except Exception as e:
            results[city] = {"error": str(e)}
    if "Pune" in results and "petrol" in results["Pune"]:
        try:
            pune_data = results["Pune"]
            supabase.table("settings").update({
                "fuel_prices": {
                    "petrol": pune_data.get("petrol"),
                    "diesel": pune_data.get("diesel"),
                    "city": "Pune",
                    "updated": datetime.now(timezone.utc).isoformat()
                }
            }).eq("id", 1).execute()
        except Exception as e:
            logger.error(f"Failed to update global fuel settings: {e}")
    log_audit(user["username"], "force_fetch_fuel_prices")
    return {"ok": True, "data": results}

# --- Legacy Endpoints for React UI ---
@router.get("/api/admin/dashboard")
def get_dashboard(user: dict = Depends(check_admin)):
    stats = {}
    tags: dict = {}
    recent_posts: list = []
    maintenance = False
    if supabase:
        try:
            r = supabase.table("settings").select("maintenance_mode").eq("id", 1).execute()
            if r.data:
                maintenance = r.data[0].get("maintenance_mode", False)

            p = supabase.table("posts").select("*", count="exact").execute()
            posts_count = p.count if p.count else 0
            u = supabase.table("app_users").select("*", count="exact").execute()
            users_count = u.count if u.count else 0

            scans_count = 0
            try:
                s = supabase.table("scan_logs").select("*", count="exact").execute()
                scans_count = s.count if s.count else 0
            except Exception:
                pass

            stats = {
                "total_posts": posts_count,
                "total_users": users_count,
                "posts": posts_count,
                "users": users_count,
                "scans": scans_count,
            }

            try:
                pr = supabase.table("posts").select("*").order("created_at", desc=True).limit(50).execute()
                rows = pr.data or []
                for pp in rows:
                    t = pp.get("tag") or "General"
                    tags[t] = tags.get(t, 0) + 1
                recent_posts = [
                    {
                        "id": pp.get("id"),
                        "title": (pp.get("title") or pp.get("body") or "Untitled")[:80],
                        "author": pp.get("author") or "Anonymous",
                        "tag": pp.get("tag") or "General",
                        "time": pp.get("time") or pp.get("created_at") or "",
                    }
                    for pp in rows[:5]
                ]
            except Exception:
                pass
        except Exception:
            pass
    return {"stats": stats, "tags": tags, "recent_posts": recent_posts, "maintenance": maintenance}

class MaintenanceUpdate(BaseModel):
    enabled: bool

@router.post("/api/admin/maintenance")
def update_maintenance(req: MaintenanceUpdate, user: dict = Depends(check_admin)):
    if not supabase: raise HTTPException(500, "Database error")
    supabase.table("settings").update({"maintenance_mode": req.enabled}).eq("id", 1).execute()
    log_audit(user["username"], "update_maintenance_mode", {"enabled": req.enabled})
    return {"ok": True, "maintenance_mode": req.enabled}

@router.get("/api/admin/feature-usage")
def get_feature_usage(user: dict = Depends(check_admin)):
    if not supabase: return {"features": []}
    r = supabase.table("api_metrics").select("endpoint").limit(10000).execute()
    usage = {"Crop Doctor": 0, "Mandi Prices": 0, "Weather": 0, "Community": 0}
    if r.data:
        for m in r.data:
            ep = m.get("endpoint", "")
            if "ai" in ep or "crop" in ep: usage["Crop Doctor"] += 1
            elif "mandi" in ep: usage["Mandi Prices"] += 1
            elif "weather" in ep: usage["Weather"] += 1
            elif "community" in ep or "post" in ep: usage["Community"] += 1
    return {"features": [
        {"name": "Crop Doctor", "usage": usage["Crop Doctor"], "icon": "\ud83c\udf3f"},
        {"name": "Mandi Prices", "usage": usage["Mandi Prices"], "icon": "\ud83d\udcc8"},
        {"name": "Weather", "usage": usage["Weather"], "icon": "\u2600\ufe0f"},
        {"name": "Community", "usage": usage["Community"], "icon": "\ud83d\udc65"}
    ]}

@router.get("/api/admin/scan-stats")
def get_scan_stats(user: dict = Depends(check_admin)):
    if not supabase: return {"total": 0, "avg_confidence": 0, "top_crops": [], "top_diseases": [], "by_severity": dict(), "by_date": dict()}
    try:
        r = supabase.table("scan_logs").select("*").execute()
        total = len(r.data) if r.data else 0
        disease_map = {}
        crop_map = {}
        severity = {"High": 0, "Medium": 0, "Low": 0}
        by_date = {}
        conf_sum = 0
        if r.data:
            for scan in r.data:
                d = scan.get("disease", "Unknown")
                c = scan.get("crop", "Unknown")
                conf = scan.get("confidence", 90)
                date_str = scan.get("created_at", datetime.now(timezone.utc).isoformat())[:10]
                disease_map[d] = disease_map.get(d, 0) + 1
                crop_map[c] = crop_map.get(c, 0) + 1
                by_date[date_str] = by_date.get(date_str, 0) + 1
                conf_sum += conf
                if "blight" in d.lower() or "rust" in d.lower(): severity["High"] += 1
                elif "healthy" in d.lower(): severity["Low"] += 1
                else: severity["Medium"] += 1
        top_diseases = [{"name": k, "count": v} for k, v in sorted(disease_map.items(), key=lambda x: x[1], reverse=True)[:5]]
        top_crops = [{"name": k, "count": v} for k, v in sorted(crop_map.items(), key=lambda x: x[1], reverse=True)[:5]]
        avg_conf = round(conf_sum / total) if total > 0 else 0
        return {"total": total, "avg_confidence": avg_conf, "top_crops": top_crops, "top_diseases": top_diseases, "by_severity": severity, "by_date": by_date}
    except Exception:
        return {"total": 0, "avg_confidence": 0, "top_crops": [], "top_diseases": [], "by_severity": dict(), "by_date": dict()}

@router.get("/api/admin/error-stats")
def get_error_stats(user: dict = Depends(check_admin)):
    if not supabase: return {"recent_errors": []}
    r = supabase.table("api_metrics").select("ts, endpoint, status_code").gte("status_code", 400).order("ts", desc=True).limit(50).execute()
    errors = []
    if r.data:
        for e in r.data:
            errors.append({"time": e.get("ts"), "endpoint": e.get("endpoint"), "error": f"HTTP {e.get('status_code')}", "count": 1})
    return {"recent_errors": errors}

@router.get("/api/admin/login-activity")
def get_login_activity(user: dict = Depends(check_admin)):
    if _login_activity:
        source = _login_activity[:50]
    elif supabase:
        try:
            r = supabase.table("login_activity").select("*").order("timestamp", desc=True).limit(50).execute()
            source = r.data or []
        except Exception:
            source = []
    else:
        source = []
    logs = [
        {
            "ip": e.get("ip", "unknown"),
            "username": e.get("username", ""),
            "status": "success" if e.get("success") else "failed",
            "ts": e.get("timestamp"),
            "user_agent": e.get("user_agent", ""),
        }
        for e in source
    ]
    return {"logs": logs}

@router.get("/api/admin/health-stats")
def get_health_stats(user: dict = Depends(check_admin)):
    import os
    cpu_usage = None
    try:
        if hasattr(os, "getloadavg"):
            cores = os.cpu_count() or 1
            cpu_usage = round(os.getloadavg()[0] * 100 / cores, 1)
    except Exception as e:
        logger.warning(f"health-stats: could not read CPU load: {e}")
    mem_percent = None
    try:
        if os.path.exists('/proc/meminfo'):
            meminfo = {}
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    parts = line.split(':')
                    if len(parts) == 2:
                        meminfo[parts[0].strip()] = int(parts[1].strip().split()[0])
            mem_total = meminfo.get("MemTotal")
            mem_avail = meminfo.get("MemAvailable")
            if mem_total and mem_avail is not None:
                mem_percent = round(((mem_total - mem_avail) / mem_total) * 100, 1)
    except Exception as e:
        logger.warning(f"health-stats: could not read memory: {e}")
    uptime_hours = round((time.time() - _PROCESS_START) / 3600, 2)
    active_connections = 0
    if supabase:
        try:
            five_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
            rec = supabase.table("api_metrics").select("id", count="exact").gte("ts", five_min_ago).execute()
            active_connections = rec.count or 0
        except Exception as e:
            logger.warning(f"health-stats: could not read recent activity: {e}")
    degraded = (cpu_usage is not None and cpu_usage > 90) or (mem_percent is not None and mem_percent > 90)
    return {
        "status": "degraded" if degraded else "healthy",
        "uptime_hours": uptime_hours,
        "cpu_usage": f"{cpu_usage}%" if cpu_usage is not None else "n/a",
        "memory_usage": f"{mem_percent}%" if mem_percent is not None else "n/a",
        "active_connections": active_connections
    }

@router.get("/api/admin/ai-usage")
def get_ai_usage(user: dict = Depends(check_admin)):
    log_audit(user["username"], "viewed_ai_usage")
    from dependencies import _ai_usage, MODEL, MODEL2
    total_tokens = _ai_usage.get("total_tokens", 0)
    total_calls = _ai_usage.get("total_calls", 0)
    by_model = _ai_usage.get("by_model", {})
    by_date = _ai_usage.get("by_date", {})
    by_source = _ai_usage.get("by_source", {})
    if by_model and total_tokens > 0:
        model_split = {m: round(t * 100 / total_tokens, 1) for m, t in by_model.items()}
    else:
        model_split = {MODEL: 0, MODEL2: 0}
    daily_usage = [{"date": d, "tokens": t} for d, t in sorted(by_date.items())]
    top_users = [{"username": s, "tokens": t} for s, t in sorted(by_source.items(), key=lambda x: x[1], reverse=True)[:10]]
    return {
        "total_tokens": total_tokens, "total_calls": total_calls,
        "total_cost": round(total_tokens * 0.0000002, 4),
        "daily_usage": daily_usage, "top_users": top_users,
        "model_split": model_split, "since": _ai_usage.get("started_at"),
        "note": "Live token counts from the Groq API since the last server restart."
    }

@router.get("/api/admin/rate-limits")
def get_rate_limits_health(user: dict = Depends(check_admin)):
    limits = {"max_req": 20, "window": 60}
    top_ips: list = []
    if not supabase:
        return {"limits": limits, "top_ips": top_ips}
    try:
        r = supabase.table("settings").select("rate_limit_config").eq("id", 1).execute()
        if r.data and r.data[0].get("rate_limit_config"):
            cfg = r.data[0]["rate_limit_config"]
            limits = {"max_req": int(cfg.get("max_req", 20)), "window": int(cfg.get("window", 60))}
    except Exception:
        pass
    try:
        five_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        rec = supabase.table("api_metrics").select("ip_address, ts").gte("ts", five_min_ago).order("ts", desc=True).limit(5000).execute()
        counts: dict = {}
        last_seen: dict = {}
        for m in (rec.data or []):
            ip = m.get("ip_address") or "unknown"
            counts[ip] = counts.get(ip, 0) + 1
            if ip not in last_seen:
                last_seen[ip] = m.get("ts", "")
        top_ips = [
            {"ip": ip, "requests_last_5min": c, "last_seen": last_seen.get(ip, "")}
            for ip, c in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:20]
        ]
    except Exception:
        pass
    return {"limits": limits, "top_ips": top_ips}

class RunTaskRequest(BaseModel):
    task: str

@router.get("/api/admin/tasks-status")
def get_tasks_status(user: dict = Depends(check_admin)):
    from dependencies import _task_last_run
    return {
        "tasks": {
            "refresh_mandi": {"last_run": _task_last_run.get("refresh_mandi", "Never")},
            "refresh_fuel": {"last_run": _task_last_run.get("refresh_fuel", "Never")},
            "refresh_news": {"last_run": _task_last_run.get("refresh_news", "Never")},
            "purge_visitors": {"last_run": _task_last_run.get("purge_visitors", "Never")},
            "purge_old_posts": {"last_run": _task_last_run.get("purge_old_posts", "Never")},
            "auto_scheduler": {"last_run": _task_last_run.get("auto_scheduler", "Never")}
        }
    }

@router.post("/api/admin/run-task")
async def run_task(req: RunTaskRequest, user: dict = Depends(check_admin)):
    from dependencies import _task_last_run
    task_name = req.task
    KNOWN_TASKS = {"refresh_mandi", "refresh_fuel", "refresh_news", "purge_visitors", "purge_old_posts", "auto_scheduler"}
    if task_name not in KNOWN_TASKS:
        raise HTTPException(400, f"Unknown task '{task_name}'. Allowed: {', '.join(sorted(KNOWN_TASKS))}")
    _task_last_run[task_name] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    if task_name == "refresh_mandi":
        from routers.market import _mandi_cache, fetch_mandi_data
        _mandi_cache.clear()
        try:
            data = await fetch_mandi_data("Maharashtra", 500)
            source = data.get("source", "fallback")
            count = len(data.get("records", []))
            live_error = data.get("live_error", "")
            if source == "live":
                return {"result": f"\u2705 Mandi refreshed from live data.gov.in API ({count} records cached)."}
            # Build a helpful diagnosis message
            if "403" in live_error or "401" in live_error:
                diagnosis = "API key rejected (403/401) \u2014 double-check DATAGOV_API_KEY in Render env vars."
            elif "timeout" in live_error or "unreachable" in live_error:
                diagnosis = "Connection timed out \u2014 data.gov.in may be blocking Render's server IP. Try the agmarknet fallback or contact data.gov.in support."
            elif "zero_records" in live_error:
                diagnosis = "API key accepted but returned 0 records \u2014 the resource IDs may not have Maharashtra data. Try a different dataset on data.gov.in."
            elif live_error:
                diagnosis = live_error
            else:
                diagnosis = "All live sources unavailable."
            return {"result": f"\u26a0\ufe0f Mandi cache cleared, serving {count} reference prices. Reason: {diagnosis}"}
        except Exception as e:
            return {"result": f"Mandi cache cleared, but live refresh failed: {type(e).__name__}: {e}"}

    elif task_name == "refresh_fuel":
        from routers.market import _fuel_cache, fetch_fuel_data
        _fuel_cache.clear()
        cities = ["Pune", "Mumbai", "Delhi"]
        fetched = {}
        live_count = 0
        for city in cities:
            try:
                data = await fetch_fuel_data(city)
                fetched[city] = data
                if data.get("source") == "live":
                    live_count += 1
            except Exception as e:
                fetched[city] = {"error": str(e)}
        pune = fetched.get("Pune", {})
        if supabase and pune.get("petrol") and pune.get("diesel"):
            try:
                supabase.table("settings").update({
                    "fuel_prices": {
                        "petrol": pune.get("petrol"),
                        "diesel": pune.get("diesel"),
                        "city": "Pune",
                        "updated": datetime.now(timezone.utc).isoformat()
                    }
                }).eq("id", 1).execute()
            except Exception as e:
                logger.error(f"refresh_fuel: could not persist settings: {e}")
        summary = ", ".join(f"{c}: petrol {d.get('petrol','?')} / diesel {d.get('diesel','?')} ({d.get('source','error')})" for c, d in fetched.items())
        return {"result": f"Fuel prices refreshed - {live_count}/{len(cities)} cities live from NDTV. {summary}"}

    elif task_name == "refresh_news":
        from routers.market import _news_cache, fetch_news_data
        _news_cache.clear()
        try:
            data = await fetch_news_data()
            source = data.get("source", "unknown")
            count = len(data.get("news", []))
            if source != "fallback":
                return {"result": f"News refreshed live from {source} ({count} headlines cached)."}
            return {"result": f"News cache cleared, but all RSS feeds were unreachable - serving {count} curated fallback headlines. Will retry next run."}
        except Exception as e:
            return {"result": f"News cache cleared, but live refresh failed: {type(e).__name__}: {e}"}

    elif task_name == "purge_visitors":
        if supabase:
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            supabase.table("visitors").delete().lt("created_at", thirty_days_ago).execute()
        return {"result": "Old visitors purged!"}

    elif task_name == "purge_old_posts":
        if supabase:
            ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
            supabase.table("posts").delete().lt("created_at", ninety_days_ago).execute()
        return {"result": "Old posts purged!"}

    elif task_name == "auto_scheduler":
        # Manually run the same refresh the 6-hour background scheduler performs.
        from routers.market import (
            _mandi_cache, _fuel_cache, _news_cache,
            fetch_mandi_data, fetch_fuel_data, fetch_news_data,
        )
        from dependencies import ws_manager
        summary = []
        try:
            _news_cache.clear()
            news = await fetch_news_data()
            summary.append(f"news: {news.get('source', 'unknown')} ({len(news.get('news', []))})")
        except Exception as e:
            summary.append(f"news failed: {e}")
        try:
            _mandi_cache.clear()
            mandi = await fetch_mandi_data("Maharashtra", 500)
            summary.append(f"mandi: {mandi.get('source', 'fallback')} ({len(mandi.get('records', []))})")
        except Exception as e:
            summary.append(f"mandi failed: {e}")
        try:
            _fuel_cache.clear()
            live = 0
            for c in ("Pune", "Mumbai", "Delhi"):
                d = await fetch_fuel_data(c)
                if d.get("source") == "live":
                    live += 1
            summary.append(f"fuel: {live}/3 live")
        except Exception as e:
            summary.append(f"fuel failed: {e}")
        try:
            await ws_manager.broadcast(json.dumps({"type": "prices_updated", "timestamp": datetime.now(timezone.utc).isoformat()}))
        except Exception as e:
            logger.warning(f"auto_scheduler broadcast failed: {e}")
        return {"result": "Auto-scheduler ran — " + "; ".join(summary)}
    return {"result": "Task executed"}

@router.post("/api/admin/change-password")
def change_password(req: ChangePasswordRequest, user: dict = Depends(check_admin)):
    if not supabase: return {"success": False}
    r = supabase.table("admins").select("password_hash").eq("username", user["username"]).execute()
    if not r.data: raise HTTPException(404, "User not found")
    current_hash = r.data[0]["password_hash"]
    if not verify_password(req.current_password, current_hash):
        raise HTTPException(400, "Incorrect current password")
    new_hash = get_password_hash(req.new_password)
    supabase.table("admins").update({"password_hash": new_hash}).eq("username", user["username"]).execute()
    log_audit(user["username"], "changed_password")
    return {"success": True}

@router.post("/api/admin/feature-order")
async def update_feature_order(request: Request, user: dict = Depends(check_admin)):
    if not supabase: return {"success": False}
    data = await request.json()
    features = data.get("features", [])
    supabase.table("settings").update({"feature_order": features}).eq("id", 1).execute()
    log_audit(user["username"], "updated_feature_order")
    return {"success": True}


@router.get("/api/admin/blocked-ips")
def get_blocked_ips(user: dict = Depends(check_admin)):
    settings = get_settings()
    blocked = settings.get("blocked_ips", [])
    return {"blocked_ips": blocked, "ips": blocked}

class BlockIPRequest(BaseModel):
    ip: str

@router.post("/api/admin/block-ip")
def block_ip(req: BlockIPRequest, user: dict = Depends(check_admin)):
    settings = get_settings()
    ips = settings.get("blocked_ips", [])
    if req.ip not in ips:
        ips.append(req.ip)
        if supabase:
            supabase.table("settings").update({"blocked_ips": ips}).eq("id", 1).execute()
        log_audit(user["username"], "block_ip", {"ip": req.ip})
    return {"ok": True}

@router.delete("/api/admin/block-ip")
def block_ip_delete(req: BlockIPRequest, user: dict = Depends(check_admin)):
    """Unblock an IP via DELETE (used by SystemHealth.jsx Unblock button)."""
    settings = get_settings()
    ips = settings.get("blocked_ips", [])
    if req.ip in ips:
        ips.remove(req.ip)
        if supabase:
            supabase.table("settings").update({"blocked_ips": ips}).eq("id", 1).execute()
        log_audit(user["username"], "unblock_ip", {"ip": req.ip})
    return {"ok": True}

@router.post("/api/admin/unblock-ip")
def unblock_ip(req: BlockIPRequest, user: dict = Depends(check_admin)):
    settings = get_settings()
    ips = settings.get("blocked_ips", [])
    if req.ip in ips:
        ips.remove(req.ip)
        if supabase:
            supabase.table("settings").update({"blocked_ips": ips}).eq("id", 1).execute()
        log_audit(user["username"], "unblock_ip", {"ip": req.ip})
    return {"ok": True}


@router.get("/api/admin/posts")
def get_posts(user: dict = Depends(check_admin)):
    if not supabase:
        return {"posts": []}
    try:
        r = supabase.table("posts").select("*").order("created_at", desc=True).limit(500).execute()
        posts = []
        for p in (r.data or []):
            title = p.get("title") or ""
            body = p.get("body") or ""
            content = (title + " - " + body) if title and body else (body or title)
            posts.append(dict(
                id=p.get("id"), author_name=p.get("author") or "Anonymous",
                content=content, tag=p.get("tag") or "General",
                likes=p.get("likes") or 0, replies=p.get("replies") or 0,
                created_at=p.get("created_at"),
            ))
        return {"posts": posts}
    except Exception as e:
        logger.error(f"Get posts failed: {e}")
        return {"posts": []}


class AccessCodeCreate(BaseModel):
    code: str = ""
    tier: str = "standard"
    expires_at: str = ""
    max_uses: Optional[int] = None

@router.get("/api/admin/access-codes")
def get_access_codes(user: dict = Depends(check_admin)):
    settings = get_settings()
    default_setting = dict(enabled=False, code="")
    codes = []
    if supabase:
        try:
            r = supabase.table("access_codes").select("*").order("created_at", desc=True).limit(500).execute()
            codes = r.data or []
        except Exception as e:
            logger.error(f"Get access codes failed: {e}")
    return {"codes": codes, "access_code_setting": settings.get("access_code_setting", default_setting)}

@router.post("/api/admin/access-codes")
def create_access_code(req: AccessCodeCreate, user: dict = Depends(check_admin)):
    if not supabase:
        raise HTTPException(503, "Database not configured.")
    import secrets, string
    code = (req.code or "").strip().upper()
    if not code:
        suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        code = "KRISHI" + suffix
    if len(code) > 50:
        raise HTTPException(400, "Code too long (max 50 characters).")
    tier = req.tier if req.tier in ("standard", "premium") else "standard"
    expires_at = (req.expires_at or "").strip()
    if not expires_at:
        raise HTTPException(400, "Expiry date is required.")
    if len(expires_at) == 10:
        expires_at = expires_at + "T23:59:59+00:00"
    row = dict(code=code, tier=tier, expires_at=expires_at, max_uses=req.max_uses,
               current_uses=0, is_active=True, created_by=user["username"])
    try:
        r = supabase.table("access_codes").insert(row).execute()
    except Exception as e:
        logger.error(f"Create access code failed: {e}")
        raise HTTPException(400, f"Could not create code (it may already exist): {code}")
    log_audit(user["username"], "create_access_code", dict(code=code, tier=tier))
    created = r.data[0] if r.data else row
    return {"ok": True, "code": code, "access_code": created}

@router.patch("/api/admin/access-codes/{code_id}")
def toggle_access_code(code_id: str, user: dict = Depends(check_admin)):
    if not supabase:
        raise HTTPException(503, "Database not configured.")
    r = supabase.table("access_codes").select("is_active").eq("id", code_id).execute()
    if not r.data:
        raise HTTPException(404, "Access code not found.")
    new_state = not bool(r.data[0].get("is_active"))
    supabase.table("access_codes").update(dict(is_active=new_state)).eq("id", code_id).execute()
    log_audit(user["username"], "toggle_access_code", dict(id=code_id, is_active=new_state))
    return {"ok": True, "is_active": new_state}

@router.delete("/api/admin/access-codes/{code_id}")
def delete_access_code(code_id: str, user: dict = Depends(check_admin)):
    if not supabase:
        raise HTTPException(503, "Database not configured.")
    supabase.table("access_codes").delete().eq("id", code_id).execute()
    log_audit(user["username"], "delete_access_code", dict(id=code_id))
    return {"ok": True, "deleted": code_id}

class BroadcastRequest(BaseModel):
    message: str


@router.post("/api/admin/purge-cache")
def purge_cache(user: dict = Depends(check_admin)):
    """Clear all in-memory API response caches so the next request refetches fresh data."""
    cleared = {}
    try:
        from routers.market import _mandi_cache, _fuel_cache, _news_cache
        for label, cache in (("mandi", _mandi_cache), ("fuel", _fuel_cache), ("news", _news_cache)):
            try:
                cleared[label] = len(cache)
                cache.clear()
            except Exception as e:
                logger.warning(f"purge-cache: could not clear {label}: {e}")
    except Exception as e:
        logger.warning(f"purge-cache: market caches unavailable: {e}")
    try:
        from dependencies import api_cache_weather, api_cache_fert
        for label, cache in (("weather", api_cache_weather), ("fertilizer", api_cache_fert)):
            try:
                cleared[label] = len(cache)
                cache.clear()
            except Exception as e:
                logger.warning(f"purge-cache: could not clear {label}: {e}")
    except Exception as e:
        logger.warning(f"purge-cache: dependency caches unavailable: {e}")
    total = sum(v for v in cleared.values() if isinstance(v, int))
    log_audit(user["username"], "purge_cache", cleared)
    detail = ", ".join(f"{k}: {v}" for k, v in cleared.items()) or "no caches found"
    return {
        "ok": True,
        "cleared_entries": total,
        "detail": cleared,
        "message": f"Purged {total} cached entries ({detail}).",
    }


@router.post("/api/admin/broadcast")
async def broadcast_message(req: BroadcastRequest, user: dict = Depends(check_admin)):
    """Send a real-time message to every connected WebSocket client (/ws/prices)."""
    msg = strip_html((req.message or "").strip())
    if not msg:
        raise HTTPException(400, "Message cannot be empty.")
    from dependencies import ws_manager
    payload = json.dumps({
        "type": "admin_broadcast",
        "message": msg,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    recipients = len(ws_manager.active_connections)
    await ws_manager.broadcast(payload)
    log_audit(user["username"], "broadcast", {"message": msg[:200], "recipients": recipients})
    return {
        "ok": True,
        "recipients": recipients,
        "message": f"Broadcast delivered to {recipients} connected client(s).",
    }
