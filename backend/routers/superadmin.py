from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
import time
from datetime import datetime, timezone
from dependencies import (
    supabase, supabase_admin, rate_limit, check_superadmin, log_audit, check_admin,
    get_settings, get_password_hash, check_sql_injection, logger,
    GROQ_KEY, CORS_ORIGINS, JWT_SECRET, ADMIN_PASS
)

router = APIRouter()

# ── SUPERADMIN ENDPOINTS ──
class AdminCreate(BaseModel):
    username: str
    password: str
    role: str = "admin"

@router.get("/api/superadmin/admins")
def list_admins(user: dict = Depends(check_superadmin)):
    if not supabase: return {"admins": []}
    try:
        r = supabase.table("admins").select("id, username, role, created_at, security_policy, force_logout_ts").execute()
        
        # Merge admin_profiles
        settings = get_settings()
        admin_profiles = settings.get("admin_profiles", {})
        
        admins = r.data
        for admin in admins:
            profile = admin_profiles.get(admin["username"], {})
            admin["is_suspended"] = profile.get("is_suspended", False)
            admin["last_login_at"] = profile.get("last_login_at", None)
            admin["last_login_ip"] = profile.get("last_login_ip", None)
            admin["allowed_permissions"] = profile.get("allowed_permissions", [])
            
        return {"admins": admins}
    except Exception as e:
        logger.error(f"Error fetching admins: {e}")
        return {"admins": []}

@router.post("/api/superadmin/admins")
def create_admin(req: AdminCreate, user: dict = Depends(check_superadmin)):
    # Password strength validation
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if len(req.password) > 72:
        raise HTTPException(400, "Password must be at most 72 characters")
    if not req.username or len(req.username.strip()) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    if check_sql_injection(req.username):
        raise HTTPException(400, "Invalid username")
    
    r = supabase.table("admins").select("id").eq("username", req.username).execute()
    if r.data:
        raise HTTPException(400, "Username already exists")
    new_admin = {
        "username": req.username.strip(),
        "password_hash": get_password_hash(req.password),
        "role": req.role if req.role in ["admin", "superadmin"] else "admin"
    }
    supabase.table("admins").insert(new_admin).execute()
    log_audit(user["username"], "create_admin", {"target_username": req.username, "role": new_admin["role"]})
    return {"ok": True, "message": "Admin created"}

@router.delete("/api/superadmin/admins/{admin_id}")
def delete_admin(admin_id: str, user: dict = Depends(check_superadmin)):
    r = supabase.table("admins").select("username, role").eq("id", admin_id).execute()
    if not r.data:
        raise HTTPException(404, "Admin not found")
    target = r.data[0]
    if target["username"] == user["username"]:
        raise HTTPException(400, "Cannot delete yourself")
    
    supabase.table("admins").delete().eq("id", admin_id).execute()
    log_audit(user["username"], "delete_admin", {"target_username": target["username"]})
    return {"ok": True, "message": "Admin deleted"}

from typing import Optional, List, Dict, Any

class AdminUpdate(BaseModel):
    is_suspended: Optional[bool] = None
    allowed_permissions: Optional[List[str]] = None
    password: Optional[str] = None

@router.patch("/api/superadmin/admins/{admin_id}")
def update_admin(admin_id: str, req: AdminUpdate, user: dict = Depends(check_superadmin)):
    r = supabase.table("admins").select("username, role").eq("id", admin_id).execute()
    if not r.data:
        raise HTTPException(404, "Admin not found")
    target = r.data[0]
    username = target["username"]
    
    if username == user["username"] and req.is_suspended is True:
        raise HTTPException(400, "You cannot suspend yourself.")

    # Update password if provided
    if req.password is not None:
        if len(req.password) < 8 or len(req.password) > 72:
            raise HTTPException(400, "Password must be 8-72 characters")
        new_hash = get_password_hash(req.password)
        supabase.table("admins").update({"password_hash": new_hash}).eq("id", admin_id).execute()
        log_audit(user["username"], "reset_admin_password", {"target_username": username})

    # Update RBAC & suspension
    if req.is_suspended is None and req.allowed_permissions is None:
        return {"ok": True}

    settings = get_settings()
    admin_profiles = settings.get("admin_profiles", {})
    profile = admin_profiles.get(username, {})

    if req.is_suspended is not None:
        profile["is_suspended"] = req.is_suspended
    if req.allowed_permissions is not None:
        profile["allowed_permissions"] = req.allowed_permissions

    admin_profiles[username] = profile
    supabase.table("settings").update({"admin_profiles": admin_profiles}).eq("id", 1).execute()
    log_audit(user["username"], "update_admin_profile", {"target_username": username, "suspended": req.is_suspended})
    
    return {"ok": True, "message": "Admin updated successfully"}

@router.get("/api/superadmin/audit_logs")
def get_audit_logs(user: dict = Depends(check_superadmin)):
    if not supabase: return {"logs": []}
    try:
        r = supabase.table("audit_logs").select("*").order("created_at", desc=True).limit(100).execute()
        return {"logs": r.data}
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        return {"logs": []}

@router.post("/api/superadmin/purge")
def purge_old_data(days: int = 30, user: dict = Depends(check_superadmin)):
    if not supabase: return {"purged_posts": 0, "purged_visitors": 0}
    if days < 1:
        raise HTTPException(400, "Days must be at least 1")
    cutoff = int(time.time()) - (days * 24 * 60 * 60)
    p_res = supabase.table("posts").delete().lt("ts", cutoff).execute()
    v_res = supabase.table("visitors").delete().lt("ts", cutoff).execute()
    log_audit(user["username"], "purge_data", {"days": days})
    return {
        "ok": True,
        "purged_posts": len(p_res.data) if p_res.data else 0,
        "purged_visitors": len(v_res.data) if v_res.data else 0
    }

class AdminPolicyUpdate(BaseModel):
    allowed_ips: list[str]

@router.post("/api/superadmin/admins/{username}/revoke")
def revoke_admin_session(username: str, user: dict = Depends(check_superadmin)):
    if not supabase: raise HTTPException(500, "Database error")
    now_ts = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("admins").update({"force_logout_ts": now_ts}).eq("username", username).execute()
        log_audit(user["username"], "revoke_session", {"target_username": username})
        return {"ok": True, "message": f"All active sessions for {username} have been revoked."}
    except Exception as e:
        logger.error(f"Failed to revoke session: {e}")
        raise HTTPException(500, "Failed to revoke session")

@router.post("/api/superadmin/admins/{username}/policy")
def update_admin_policy(username: str, req: AdminPolicyUpdate, user: dict = Depends(check_superadmin)):
    if not supabase: raise HTTPException(500, "Database error")
    try:
        policy = {"allowed_ips": req.allowed_ips}
        supabase.table("admins").update({"security_policy": policy}).eq("username", username).execute()
        log_audit(user["username"], "update_security_policy", {"target_username": username, "policy": policy})
        return {"ok": True, "message": "Security policy updated successfully."}
    except Exception as e:
        logger.error(f"Failed to update security policy: {e}")
        raise HTTPException(500, "Failed to update security policy")


@router.get("/api/admin/users")
def get_auth_users(user: dict = Depends(check_admin)):
    if not supabase_admin:
        # Fallback: try to get users from posts table authors
        if supabase:
            try:
                posts_resp = supabase.table("posts").select("author, likes, created_at").execute()
                posts = posts_resp.data if posts_resp.data else []
                authors = {}
                for p in posts:
                    a = p.get("author", "Unknown")
                    if a not in authors:
                        authors[a] = {"id": a, "email": "", "username": a, "created_at": p.get("created_at", ""), "total_posts": 0, "total_likes": 0}
                    authors[a]["total_posts"] += 1
                    authors[a]["total_likes"] += p.get("likes", 0)
                return {"users": list(authors.values())}
            except Exception:
                pass
        return {"users": []}
    try:
        auth_resp = supabase_admin.auth.admin.list_users()
        # Handle different supabase SDK versions
        if isinstance(auth_resp, list):
            users = auth_resp
        elif hasattr(auth_resp, 'users'):
            users = auth_resp.users
        elif isinstance(auth_resp, dict):
            users = auth_resp.get('users', auth_resp.get('data', []))
        else:
            users = list(auth_resp) if auth_resp else []
        
        posts_resp = supabase.table("posts").select("author, likes").execute()
        posts = posts_resp.data if posts_resp.data else []
        
        user_list = []
        for u in users:
            if isinstance(u, dict):
                email = u.get('email', '')
                uid = u.get('id', '')
                created = u.get('created_at', '')
                last_sign = u.get('last_sign_in_at', '')
            else:
                email = getattr(u, 'email', '') or ''
                uid = getattr(u, 'id', '')
                created = getattr(u, 'created_at', '')
                last_sign = getattr(u, 'last_sign_in_at', '')
                if hasattr(created, 'isoformat'): created = created.isoformat()
                if hasattr(last_sign, 'isoformat'): last_sign = last_sign.isoformat()
            
            username = email.split("@")[0] if email else "Unknown"
            user_posts = [p for p in posts if p.get("author") == username]
            user_list.append({
                "id": str(uid),
                "email": email,
                "created_at": str(created),
                "last_sign_in": str(last_sign),
                "total_posts": len(user_posts),
                "total_likes": sum(p.get("likes", 0) for p in user_posts)
            })
        return {"users": user_list}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(500, str(e))

@router.delete("/api/admin/users/{user_id}")
def delete_auth_user(user_id: str, email: str, user: dict = Depends(check_admin)):
    if not supabase_admin:
        raise HTTPException(503, "SUPABASE_SERVICE_ROLE_KEY is not configured.")
    try:
        username = email.split("@")[0]
        supabase.table("posts").delete().eq("author", username).execute()
        supabase_admin.auth.admin.delete_user(user_id)
        log_audit(user["username"], "delete_app_user", {"deleted_email": email})
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/api/admin/chat-logs")
def get_chat_logs(user: dict = Depends(check_admin)):
    """Return chat logs from crop doctor interactions (if table exists)."""
    if not supabase:
        return {"logs": [], "message": "Database not configured"}
    try:
        r = supabase.table("chat_logs").select("*").order("created_at", desc=True).limit(100).execute()
        return {"logs": r.data or []}
    except Exception as e:
        logger.warning(f"Chat logs table may not exist: {e}")
        return {"logs": [], "message": "Chat logs table not available. Create a 'chat_logs' table in Supabase to enable this feature."}

@router.get("/api/visitors")
def get_visitors_public(req: Request):
    """Visitors endpoint — rate limited, returns only aggregate stats (no raw IPs to public)."""
    rate_limit(req, max_req=10, window=60)
    if not supabase: return {"total": 0, "unique": 0, "today": 0}
    try:
        vis_res = supabase.table("visitors").select("time, page").order("ts", desc=True).limit(500).execute()
        visitors = vis_res.data or []
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_count = sum(1 for v in visitors if v.get("time","").startswith(today_str))
        return {
            "total": len(visitors),
            "unique": 0,  # Don't expose unique IP count publicly
            "unique_visitors": 0,
            "today": today_count
        }
    except Exception as e:
        logger.error(f"Visitors error: {e}")
        return {"total": 0, "unique": 0, "today": 0}

@router.get("/health")
def health():
    return {
        "status": "ok",
        "version": "13.0_supabase",
        "groq": bool(GROQ_KEY),
        "supabase": bool(supabase),
    }

@router.get("/api/debug/cors")
def debug_cors(user: dict = Depends(check_admin)):
    """Debug endpoint to verify CORS config. Admin-only.

    Deliberately does NOT expose secret material (e.g. the JWT secret length),
    only booleans indicating whether required config is present.
    """
    return {
        "cors_origins": CORS_ORIGINS,
        "jwt_secret_set": bool(JWT_SECRET),
        "supabase_connected": supabase is not None,
        "admin_pass_set": bool(ADMIN_PASS),
    }
