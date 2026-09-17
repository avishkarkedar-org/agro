from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from dependencies import supabase, supabase_admin, rate_limit, check_admin, check_superadmin, PostCreate, PostReply, logger
import time

router = APIRouter()  # COMMUNITY_AUTH_R94

# ── COMMUNITY_OWNERSHIP_R131 ─────────────────────────────────────────────────────
# Three of this file's endpoints decide whether you may modify a post, and
# before R131 they each decided it differently:
#
#   DELETE /api/posts/{id}   consulted the JWT, then fell back to a name match
#   POST   /api/posts/{id}/sold   name match only, no token read at all
#   POST   /api/posts/{id}/edit   name match only, no token read at all
#
# The author name is public - GET /api/posts returns it - so the two endpoints
# that only compared names could be driven by anyone who could read a listing.
# All three now go through _assert_can_modify() so they cannot drift again.
#
# READ THIS BEFORE "improving" THE EMAIL PATH: the posts table has NO
# user_email column. delete_post used to select("author,user_email") and that
# select is what made deletion return 500 - PostgREST errors on an unknown
# column and the bare except turned it into a generic failure. Rows are now
# loaded with select("*") and the email read with .get(), which is None on a
# schema without the column rather than an error. Do not add user_email to any
# INSERT until the column exists:
#
#   ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_email TEXT;
#
# Until then the email branch is dormant by design and ownership is a name
# comparison, which is weak. It is documented rather than silently trusted.

_REPLY_TAG = "Reply"
_MAIN_POST_LIMIT = 200
_REPLY_LIMIT = 500


def _get_request_user_email(req: Request) -> str:
    """
    Extract and verify the caller email from the Supabase JWT in the
    Authorization header. Returns empty string if no token is provided
    (unauthenticated / guest). Raises 401 if a token IS present but invalid.
    """
    auth = req.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return ""
    token = auth[7:].strip()
    if not token:
        return ""
    if not supabase:
        return ""
    try:
        user = supabase.auth.get_user(token)
        return (user.user.email or "").strip().lower() if user and user.user else ""
    except Exception:
        raise HTTPException(401, "Invalid or expired session. Please log in again.")


def _load_post_or_404(post_id: int) -> dict:
    """
    Load one post row. select("*") is deliberate: selecting a named column that
    does not exist on this schema is what made delete_post fail with a 500.
    """
    r = supabase.table("posts").select("*").eq("id", post_id).execute()
    if not r.data:
        raise HTTPException(404, "Listing not found.")
    return r.data[0]


def _assert_can_modify(row: dict, claimed_author: str, req: Request, message: str) -> None:
    """
    Single ownership rule for delete / sold / edit.

    Prefers a verified email match when the row carries an owner email. If the
    post is bound to an email, ONLY that email can modify it. Otherwise falls
    back to comparing the claimed author name, which is what legacy rows need.
    Raises 403 when neither test passes.
    """
    verified_email = _get_request_user_email(req)
    owner = (row.get("author") or "").strip()
    owner_email = (row.get("user_email") or "").strip().lower()
    
    if owner_email:
        if not verified_email or verified_email != owner_email:
            raise HTTPException(403, message)
        return
        
    if verified_email and owner:
        if verified_email.split("@")[0].lower() == owner.lower():
            return

    if not claimed_author or owner.lower() != claimed_author.strip().lower():
        raise HTTPException(403, message)


@router.get("/api/posts")
def get_posts():
    """
    Returns main posts AND their replies in one array with server-asserted expert verification.
    """
    if not supabase: return {"posts": []}
    try:
        r = supabase.table("posts").select("*").neq("tag", _REPLY_TAG).order("id", desc=True).limit(_MAIN_POST_LIMIT).execute()
        posts = list(r.data or [])
    except Exception as e:
        logger.error(f"Error fetching posts: {e}")
        return {"posts": []}
    try:
        rr = supabase.table("posts").select("*").eq("tag", _REPLY_TAG).order("id", desc=False).limit(_REPLY_LIMIT).execute()
        posts.extend(rr.data or [])
    except Exception as e:
        logger.warning(f"Could not fetch replies for the feed: {e}")

    try:
        settings = get_settings()
        experts = [e.lower().strip() for e in (settings.get("verified_experts") or [])]
        for p in posts:
            em = (p.get("user_email") or "").lower().strip()
            auth = (p.get("author") or "").lower().strip()
            p["is_expert"] = bool((em and em in experts) or (auth in experts and em))
    except Exception as e:
        logger.warning(f"Could not compute is_expert: {e}")

    return {"posts": posts}

@router.post("/api/posts")
async def create_post(request: PostCreate, req: Request):
    rate_limit(req, max_req=30, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    
    verified_email = ""
    try:
        verified_email = _get_request_user_email(req)
    except HTTPException:
        pass

    post = {  # POST_ID_FIX_R94 — id auto-assigned by Supabase bigserial
        "author": request.author or "Anonymous",
        "loc": request.loc or "India",
        "title": request.title[:200],
        "body": request.body[:1000],
        "tag": request.tag,
        "emoji": request.emoji,
        "likes": 0,
        "replies": 0,
        "time": time.strftime("%d %b %Y, %I:%M %p IST"),
        "ts": int(time.time())
    }
    
    inserted = False
    result = None
    if verified_email:
        post_with_email = dict(post)
        post_with_email["user_email"] = verified_email
        try:
            result = supabase.table("posts").insert(post_with_email).execute()
            inserted = True
        except Exception as e:
            logger.warning(f"Could not insert post with user_email (column may not exist): {e}")

    if not inserted:
        try:
            result = supabase.table("posts").insert(post).execute()
        except Exception as e:
            logger.error(f"Error creating post: {e}")
            raise HTTPException(500, "Could not create post. Please try again.")

    if result and result.data:
        post = {**post, "id": result.data[0].get("id", post.get("id"))}
        
    return post


@router.delete("/api/posts/{post_id}")
def delete_post(post_id: int, author: str, req: Request):
    rate_limit(req, max_req=20, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    try:
        row = _load_post_or_404(post_id)
        _assert_can_modify(row, author, req, "You can only remove your own listing.")
        supabase.table("posts").delete().eq("id", post_id).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting post: {e}")
        raise HTTPException(500, "Internal Server Error")


class SoldRequest(BaseModel):
    author: str = Field(default="", max_length=100)


@router.post("/api/posts/{post_id}/sold")
def mark_post_sold(post_id: int, body: SoldRequest, req: Request):
    rate_limit(req, max_req=20, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    try:
        row = _load_post_or_404(post_id)
        _assert_can_modify(row, body.author, req, "You can only update your own listing.")
        title = row.get("title") or ""
        if "[SOLD]" not in title:
            title = "[SOLD] " + title
        supabase.table("posts").update({"title": title[:200]}).eq("id", post_id).execute()
        return {"ok": True, "title": title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking sold: {e}")
        raise HTTPException(500, "Internal Server Error")


class EditRequest(BaseModel):
    author: str = Field(default="", max_length=100)
    title: str = Field(default="", max_length=200)
    body: str = Field(default="", max_length=1000)
    loc: str = Field(default="", max_length=120)


@router.post("/api/posts/{post_id}/edit")
def edit_post(post_id: int, payload: EditRequest, req: Request):
    rate_limit(req, max_req=20, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    try:
        row = _load_post_or_404(post_id)
        _assert_can_modify(row, payload.author, req, "You can only edit your own listing.")
        old_title = row.get("title") or ""
        new_title = (payload.title or "")[:200]
        if "[SOLD]" in old_title and "[SOLD]" not in new_title:
            new_title = "[SOLD] " + new_title
        supabase.table("posts").update({
            "title": new_title,
            "body": (payload.body or "")[:1000],
            "loc": payload.loc or "India",
        }).eq("id", post_id).execute()
        return {"ok": True, "title": new_title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing post: {e}")
        raise HTTPException(500, "Internal Server Error")

@router.post("/api/posts/{post_id}/like")  # LIKE_ATOMIC_R94
def like_post(post_id: int, req: Request):
    rate_limit(req, max_req=30, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    try:
        # Atomic increment via RPC to avoid read-write race condition
        try:
            rpc_result = supabase.rpc("increment_post_likes", {"post_id": post_id}).execute()
            new_likes = rpc_result.data if isinstance(rpc_result.data, int) else None
            if new_likes is not None:
                return {"likes": new_likes}
        except Exception:
            pass  # RPC not available — fall back to read-then-write
        # Fallback: read-then-write (non-atomic but functional)
        r = supabase.table("posts").select("likes").eq("id", post_id).execute()
        if not r.data:
            raise HTTPException(404, "Post not found.")
        current_likes = r.data[0].get("likes", 0) or 0
        supabase.table("posts").update({"likes": current_likes + 1}).eq("id", post_id).execute()
        return {"likes": current_likes + 1}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error liking post: {e}")
        raise HTTPException(500, "Internal Server Error")

@router.post("/api/posts/{post_id}/reply")
def reply_post(post_id: int, request: PostReply, req: Request):
    rate_limit(req, max_req=30, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    
    verified_email = ""
    try:
        verified_email = _get_request_user_email(req)
    except HTTPException:
        pass

    reply_row = {
        "author": request.author or "Anonymous",
        "title": f"REPLY:{post_id}",
        "body": request.body,
        "loc": request.loc,
        "tag": _REPLY_TAG,
        "emoji": "\U0001f4ac",
        "ts": int(time.time()),
        "time": "Just now",
        "likes": 0,
        "replies": 0
    }
    
    inserted = False
    if verified_email:
        reply_with_email = dict(reply_row)
        reply_with_email["user_email"] = verified_email
        try:
            supabase.table("posts").insert(reply_with_email).execute()
            inserted = True
        except Exception as e:
            logger.warning(f"Could not insert reply with user_email (column may not exist): {e}")

    if not inserted:
        try:
            supabase.table("posts").insert(reply_row).execute()
        except Exception as e:
            logger.error(f"Error posting reply: {e}")
            raise HTTPException(500, "Could not post your reply. Please try again.")

    try:
        r = supabase.table("posts").select("replies").eq("id", post_id).execute()
        if r.data:
            supabase.table("posts").update({"replies": r.data[0].get("replies", 0) + 1}).eq("id", post_id).execute()
    except Exception as e:
        logger.warning(f"Failed to update replies count: {e}")

    return {"ok": True, "reply": reply_row}

@router.get("/api/posts/{post_id}/replies")
def get_replies(post_id: int):
    if not supabase: return {"replies": []}
    try:
        r = supabase.table("posts").select("*").eq("title", f"REPLY:{post_id}").order("id", desc=False).execute()
        return {"replies": r.data}
    except Exception as e:
        logger.error(f"Error fetching replies: {e}")
        return {"replies": []}


from datetime import datetime, timezone
from dependencies import logger

# ── SETTINGS_FAIL_CLOSED_R116 ─────────────────────────────────────────────────────
# This endpoint is the ONLY way admin settings reach the public site, so what it
# returns on failure matters as much as what it returns on success.
#
# It used to answer HTTP 200 with a five-key fragment on any error. That fragment
# has no "disabled_features" key, and FeatureGrid shows every feature that is not
# in that list - so a single failed read silently re-enabled every switched-off
# feature on the live site, and SettingsContext cached the fragment over the last
# good copy because a 200 looks like success. Ten admin pages also populate their
# forms from here, so they would render empty lists as though that were the real
# configuration and write those blanks back on the next Save.
#
# Therefore: a real failure returns 503 so the client keeps its cached settings,
# and only a genuinely unconfigured database returns defaults - complete ones,
# with every array key present.
_DEFAULT_PUBLIC_SETTINGS = {
    "youtube_id": "",
    "announcement": "",
    "ann_image": "",
    "ann_start_date": "",
    "ann_end_date": "",
    "site_title": "AgroIntel",
    "bulk_message": "",
    "maintenance_mode": False,
    "mandi_prices": [],
    "rentals": [],
    "custom_news": [],
    "verified_experts": [],
    "disabled_features": [],
    "login_required_features": [],
    "feature_order": [],
    "fuel_prices": {},
    "voice_settings": {},
    "advanced_features": {},
    "ai_settings": {},
    "weather_settings": {},
}

_SETTINGS_UNAVAILABLE = (
    "Settings are temporarily unavailable. The site is showing its last known "
    "configuration rather than resetting to defaults. Please retry shortly."
)


def _settings_client():
    """Prefer the service-role client: the anon key cannot create the settings
    row on a fresh project, which used to send this endpoint straight into the
    partial fallback."""
    return supabase_admin or supabase


@router.get("/api/settings")
def get_public_settings(req: Request):
    # RATE_LIMIT_GAP_R152: this is hit by every visitor's browser on every
    # page load and had no rate limiting at all, unlike the rest of this file.
    rate_limit(req, max_req=40, window=60)
    client = _settings_client()
    if not client:
        # Genuinely unconfigured, not a failure. Return a COMPLETE empty config.
        return dict(_DEFAULT_PUBLIC_SETTINGS)
    try:
        r = client.table("settings").select("*").eq("id", 1).execute()
        if not r.data:
            try:
                client.table("settings").insert({
                    "id": 1,
                    "youtube_id": "",
                    "announcement": "",
                    "maintenance_mode": False,
                    "mandi_prices": [],
                    "rentals": [],
                    "custom_news": [],
                    "bulk_message": "",
                }).execute()
                r = client.table("settings").select("*").eq("id", 1).execute()
            except Exception as e:
                logger.error(f"Could not create the settings row: {e}")
            if not r.data:
                # The row is missing and could not be created. Returning defaults
                # here would look authoritative and wipe the client's cache.
                logger.error("Settings row id=1 is missing and could not be created")
                raise HTTPException(503, _SETTINGS_UNAVAILABLE)
        data = r.data[0]

        # Announcement scheduling window. Compare only real date strings: a stray
        # non-string here used to raise, and the bare except turned that into a
        # partial-settings response.
        ann_start = data.get("ann_start_date") or ""
        ann_end = data.get("ann_end_date") or ""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        hide = False
        if isinstance(ann_start, str) and ann_start and today < ann_start:
            hide = True
        if isinstance(ann_end, str) and ann_end and today > ann_end:
            hide = True
        if hide:
            data["announcement"] = ""
            data["ann_image"] = ""

        # Never expose the blocklist or the row id publicly.
        data.pop("blocked_ips", None)
        data.pop("id", None)
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Settings fetch error: {e}")
        raise HTTPException(503, _SETTINGS_UNAVAILABLE)

@router.get("/api/settings/feature-order")
def get_feature_order():
    client = _settings_client()
    if not client:
        return {"order": []}
    try:
        r = client.table("settings").select("feature_order").eq("id", 1).execute()
        if r.data and r.data[0].get("feature_order"):
            return {"order": r.data[0]["feature_order"]}
    except Exception as e:
        logger.warning(f"feature-order fetch failed: {e}")
    return {"order": []}

class BugReportCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=150)
    description: str = Field(..., min_length=10, max_length=1000)
    user_identifier: str = Field(default="Anonymous", max_length=100)

@router.post("/api/bugs")
def create_bug_report(bug: BugReportCreate, req: Request):
    rate_limit(req, max_req=5, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    try:
        supabase.table("bug_reports").insert({
            "title": bug.title,
            "description": bug.description,
            "user_identifier": bug.user_identifier,
            "status": "open",
            "priority": "medium"
        }).execute()
        return {"ok": True, "message": "Bug report submitted successfully."}
    except Exception as e:
        logger.error(f"Failed to submit bug report: {e}")
        raise HTTPException(500, "Internal Server Error")
