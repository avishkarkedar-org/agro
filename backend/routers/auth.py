from fastapi import APIRouter, Request, HTTPException, Depends
import httpx
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
import os, random, smtplib, re, jwt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from dependencies import supabase, supabase_admin, rate_limit, _otp_store, log_audit, hash_otp, OTP_EXPIRY, OTP_MAX_ATTEMPTS, generate_otp, logger, JWT_SECRET, ALGORITHM

import time
from fastapi.responses import HTMLResponse

router = APIRouter()

TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY")

def verify_turnstile(token: str, req: Request) -> bool:
    if not TURNSTILE_SECRET_KEY: return True
    try:
        r = httpx.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", data={
            "secret": TURNSTILE_SECRET_KEY,
            "response": token,
            "remoteip": req.client.host
        }, timeout=5.0)
        return r.json().get("success", False)
    except Exception as e:
        logger.error(f"Turnstile error: {e}")
        return False


def _send_otp_email(to_email: str, otp: str) -> bool:
    """Send the signup OTP to the user's email via SMTP.

    Requires SMTP_HOST, SMTP_USER and SMTP_PASS environment variables (for
    Gmail use an App Password). Optional: SMTP_PORT (default 587) and
    SMTP_FROM (defaults to SMTP_USER). Returns True only when the email was
    actually sent, so callers can fail honestly if email is not configured.
    """
    host = os.environ.get("SMTP_HOST")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    if not (host and smtp_user and smtp_pass):
        logger.warning("SMTP not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS); cannot send OTP email.")
        return False
    port = int(os.environ.get("SMTP_PORT", "587"))
    sender = os.environ.get("SMTP_FROM", smtp_user)
    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = "Your AgroIntel verification code"
    body = (
        f"Namaste! \n\nYour AgroIntel verification code is: {otp}\n\n"
        "This code expires in 10 minutes. If you did not request it, "
        "please ignore this email.\n\n- Team AgroIntel"
    )
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
            .header {{ background-color: #0f4a29; padding: 24px 32px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px; }}
            .content {{ padding: 32px; color: #333333; line-height: 1.6; font-size: 16px; }}
            .otp-box {{ background-color: #eaf5ee; border: 1px solid #16a34a; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }}
            .otp {{ font-size: 32px; font-weight: 700; color: #16a34a; letter-spacing: 4px; margin: 0; }}
            .footer {{ background-color: #f9fafa; padding: 20px 32px; text-align: center; font-size: 13px; color: #666666; border-top: 1px solid #eeeeee; }}
            .footer a {{ color: #16a34a; text-decoration: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AgroIntel</h1>
            </div>
            <div class="content">
                <p>Namaste,</p>
                <p>Here is your verification code. Enter this code to verify your account and continue.</p>
                <div class="otp-box">
                    <p class="otp">{otp}</p>
                </div>
                <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>AgroIntel — Empowering Indian Agriculture</p>
                <p>Official Portal: <a href="https://agrointel.pages.dev">agrointel.pages.dev</a></p>
            </div>
        </div>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(body, "plain"))
    msg.attach(MIMEText(body_html, "html"))
    try:
        host_clean = str(host).strip().lower()
        if "resend.com" in host_clean or (smtp_pass and str(smtp_pass).strip().startswith("re_")):
            import urllib.request, json, urllib.error
            req = urllib.request.Request("https://api.resend.com/emails", headers={
                "Authorization": f"Bearer {smtp_pass.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "AgroIntel/1.0"
            }, data=json.dumps({
                "from": sender.strip(),
                "to": to_email,
                "subject": "Your AgroIntel verification code",
                "text": body,
                "html": body_html
            }).encode("utf-8"))
            try:
                with urllib.request.urlopen(req, timeout=15) as res:
                    pass
            except urllib.error.HTTPError as he:
                logger.error(f"Resend API Error: {he.read().decode('utf-8')}")
                raise he
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(sender, [to_email], msg.as_string())
        logger.info(f"OTP email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        return False


# ── Supabase Auth Endpoints ──
class SignupRequest(BaseModel):
    username: str
    email: str
    password: str
    turnstile_token: Optional[str] = None

class UserLoginRequest(BaseModel):
    identifier: str  # Can be username OR email
    password: str
    turnstile_token: Optional[str] = None

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ValidateAccessCodeRequest(BaseModel):
    code: str
    email: Optional[str] = ""



@router.get("/")
def read_root():
    return HTMLResponse(content="""
    <html>
      <head>
        <title>AgroIntel - Verified</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background: #f0fdf4; color: #166534; }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 450px; margin: 0 auto; }
          h2 { margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>✅ Verification Successful!</h2>
          <p>Your email has been successfully verified.</p>
          <p>You may now close this tab and return to the AgroIntel app to log in.</p>
        </div>
      </body>
    </html>
    """)

def _purge_expired_otps():
    """Purge stale OTP records older than OTP_EXPIRY to prevent memory leaks."""
    try:
        now = time.time()
        expired = [k for k, v in list(_otp_store.items()) if (now - v.get("ts", 0)) > OTP_EXPIRY]
        for k in expired:
            _otp_store.pop(k, None)
    except Exception as e:
        logger.warning(f"Error purging expired OTPs: {e}")

@router.post("/api/auth/signup")
def signup(req_data: SignupRequest, req: Request):
    rate_limit(req, max_req=20, window=60)
    _purge_expired_otps()
    if not supabase: raise HTTPException(503, "Database not configured.")
    if TURNSTILE_SECRET_KEY:
        if not req_data.turnstile_token:
            raise HTTPException(status_code=400, detail="CAPTCHA token missing. Please refresh and try again.")
        if not verify_turnstile(req_data.turnstile_token, req):
            raise HTTPException(status_code=400, detail="CAPTCHA verification failed.")
    username = req_data.username.strip()
    email = req_data.email.strip().lower()
    password = req_data.password.strip()
    
    # Validate username
    if len(username) < 3:
        raise HTTPException(400, "Username must be at least 3 characters.")
    if len(username) > 30:
        raise HTTPException(400, "Username must be at most 30 characters.")
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise HTTPException(400, "Username can only contain letters, numbers, and underscores.")
    
    # Validate email
    if len(email) > 100:
        raise HTTPException(400, "Email too long.")
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        raise HTTPException(400, "Invalid email format.")
    
    # Validate password
    if len(password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    if len(password) > 72:
        raise HTTPException(400, "Password must be at most 72 characters.")
    
    # Check if username already taken in app_users table
    try:
        existing = supabase.table("app_users").select("id").eq("username", username.lower()).execute()
        if existing.data:
            raise HTTPException(400, "Username already taken. Choose another.")
    except HTTPException:
        raise
    except Exception:
        pass  # Table might not exist yet, will be created on first successful signup
    
    # Check if email already registered
    try:
        existing_email = supabase.table("app_users").select("id").eq("email", email).execute()
        if existing_email.data:
            raise HTTPException(400, "Email already registered. Try logging in.")
    except HTTPException:
        raise
    except Exception:
        pass
    
    # Generate OTP and store its hash for verification
    otp = generate_otp()
    _otp_store[email] = {
        "otp_hash": hash_otp(otp),
        "ts": time.time(),
        "username": username,
        "password": password,
        "attempts": 0
    }
    
    # Email the OTP to the user. If email delivery is not configured, fail
    # clearly instead of pretending that a code was sent.
    if not _send_otp_email(email, otp):
        _otp_store.pop(email, None)
        raise HTTPException(503, "Email delivery is not configured on the server, so the verification code could not be sent. Please contact the administrator.")
    
    return {"msg": "OTP sent to your email. Please verify to complete signup.", "otp_sent": True}

@router.post("/api/auth/verify-otp")
def verify_otp(req_data: VerifyOTPRequest, req: Request):
    rate_limit(req, max_req=40, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    email = req_data.email.strip().lower()
    otp = req_data.otp.strip()
    
    stored = _otp_store.get(email)
    if not stored:
        raise HTTPException(400, "No OTP found for this email. Please sign up again.")
    
    # Check expiry
    if time.time() - stored["ts"] > OTP_EXPIRY:
        del _otp_store[email]
        raise HTTPException(400, "OTP expired. Please sign up again.")
    
    # Check max attempts
    if stored.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        del _otp_store[email]
        raise HTTPException(429, "Too many failed attempts. Please sign up again.")
    
    # Verify OTP (hashed comparison)
    if hash_otp(otp) != stored["otp_hash"]:
        stored["attempts"] = stored.get("attempts", 0) + 1
        raise HTTPException(400, "Invalid OTP. Please try again.")
    
    # OTP verified — create the actual account
    username = stored["username"]
    password = stored["password"]
    
    try:
        # Create user in Supabase Auth
        r = supabase.auth.sign_up({"email": email, "password": password})
        
        # Store username mapping in app_users table using admin client to bypass RLS
        admin_client = supabase_admin if supabase_admin else supabase
        try:
            admin_client.table("app_users").upsert({
                "username": username.lower(),
                "display_name": username,
                "email": email,
                "created_at": datetime.now(timezone.utc).isoformat()
            }, on_conflict="email").execute()
        except Exception as e:
            logger.warning(f"Could not upsert into app_users: {e}")
        
        # Clean up OTP
        del _otp_store[email]
        
        return {"msg": "Account created successfully! You can now login.", "success": True, "user": email, "username": username}
    except Exception as e:
        raise HTTPException(400, f"Signup failed: {str(e)}")

@router.post("/api/auth/resend-otp")
def resend_otp(req: Request, email: str = ""):
    rate_limit(req, max_req=12, window=120)
    if not email:
        raise HTTPException(400, "Email required.")
    email = email.strip().lower()
    
    stored = _otp_store.get(email)
    if not stored:
        raise HTTPException(400, "No pending signup found. Please start signup again.")
    
    # Generate new OTP
    new_otp = generate_otp()
    stored["otp_hash"] = hash_otp(new_otp)
    stored["attempts"] = 0
    stored["ts"] = time.time()
    _otp_store[email] = stored
    
    # Email the new OTP. Fail clearly if email delivery is not configured.
    if not _send_otp_email(email, new_otp):
        raise HTTPException(503, "Email delivery is not configured on the server, so the verification code could not be sent. Please contact the administrator.")
    
    return {"msg": "New OTP sent to your email."}

@router.post("/api/auth/login")
def auth_login(req_data: UserLoginRequest, req: Request):
    rate_limit(req, max_req=40, window=60)
    if not supabase: raise HTTPException(503, "Database not configured.")
    
    turnstile_secret = os.environ.get("TURNSTILE_SECRET_KEY")
    if turnstile_secret:
        if not req_data.turnstile_token:
            raise HTTPException(400, "CAPTCHA verification failed (missing token).")
        try:
            with httpx.Client(timeout=10) as client:
                res = client.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", data={
                    "secret": turnstile_secret,
                    "response": req_data.turnstile_token,
                    "remoteip": req.client.host if req.client else None
                })
                if not res.json().get("success"):
                    raise HTTPException(400, "CAPTCHA verification failed.")
        except httpx.RequestError:
            raise HTTPException(500, "Error connecting to CAPTCHA service.")

    identifier = req_data.identifier.strip().lower()
    password = req_data.password.strip()
    
    if len(identifier) > 100 or len(password) > 72:
        raise HTTPException(400, "Invalid credentials.")
    
    # Determine if identifier is email or username.
    # Detect an email by shape (any provider), not a hardcoded "@gmail.com"
    # suffix — otherwise users who signed up with a non-Gmail address could
    # never log in with their email.
    email = identifier
    is_email = bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", identifier))
    if not is_email:
        # It's a username — look up the email using service role / admin client
        admin_client = supabase_admin if supabase_admin else supabase
        found_email = None
        try:
            user_row = admin_client.table("app_users").select("email").ilike("username", identifier).execute()
            if user_row.data and len(user_row.data) > 0:
                found_email = user_row.data[0]["email"]
        except Exception as e:
            logger.warning(f"Username lookup in app_users failed: {e}")
        
        # Fallback: check if username matches the username prefix of an email in auth.users
        if not found_email and supabase_admin:
            try:
                auth_users = supabase_admin.auth.admin.list_users()
                users_list = auth_users if isinstance(auth_users, list) else getattr(auth_users, 'users', auth_users.get('users', []))
                for u in users_list:
                    u_email = getattr(u, 'email', u.get('email', '')) if isinstance(u, dict) else u.email
                    u_meta = getattr(u, 'user_metadata', u.get('user_metadata', {})) or {}
                    u_name = u_meta.get('username') or (u_email.split('@')[0] if u_email else '')
                    if (u_name and u_name.lower() == identifier.lower()) or (u_email and u_email.split('@')[0].lower() == identifier.lower()):
                        found_email = u_email
                        break
            except Exception as e:
                logger.warning(f"Fallback auth list_users lookup failed: {e}")
        
        if not found_email:
            raise HTTPException(401, "Invalid username or password.")
        email = found_email
    
    try:
        r = supabase.auth.sign_in_with_password({"email": email, "password": password})
        # Get username from app_users
        username = email.split('@')[0]  # fallback
        try:
            admin_client = supabase_admin if supabase_admin else supabase
            user_row = admin_client.table("app_users").select("display_name,username").eq("email", email).execute()
            if user_row.data and len(user_row.data) > 0:
                username = user_row.data[0].get("display_name", username)
        except Exception:
            pass
        return {"token": r.session.access_token, "user": r.user.email, "username": username}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Sign in failed for email {email}: {e}")
        raise HTTPException(401, "Invalid email/username or password.")

@router.post("/api/auth/validate-access-code")  # ACCESSCODE_R94
def validate_access_code(req_data: ValidateAccessCodeRequest, req: Request):
    rate_limit(req, max_req=5, window=60, bucket="auth")
    # Use supabase_admin (service role) so Supabase RLS never blocks the lookup.
    client = supabase_admin if supabase_admin else supabase
    if not client: raise HTTPException(503, "Database not configured.")

    code = req_data.code.strip().upper()
    if not code:
        raise HTTPException(400, "Access code cannot be empty.")

    try:
        r = client.table("access_codes").select("*").eq("code", code).execute()
        if not r.data:
            raise HTTPException(404, "Invalid access code. Please check your spelling and try again.")

        record = r.data[0]

        if not record.get("is_active", True):
            raise HTTPException(400, "This access code is no longer active.")

        # Check stored expiry (the DB column is expires_at, not duration_days)
        raw_expiry = record.get("expires_at")
        if raw_expiry:
            try:
                expiry_dt = datetime.fromisoformat(raw_expiry.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) > expiry_dt:
                    raise HTTPException(400, "This access code has expired.")
            except HTTPException:
                raise
            except Exception:
                pass  # malformed expiry — allow rather than block

        # Check max_uses
        max_uses = record.get("max_uses")
        current_uses = record.get("current_uses", 0) or 0
        if max_uses is not None and current_uses >= max_uses:
            raise HTTPException(400, "This access code has reached its maximum usage limit.")

        # Increment current_uses
        try:
            client.table("access_codes").update({"current_uses": current_uses + 1}).eq("id", record["id"]).execute()
        except Exception as e:
            logger.warning(f"Could not increment current_uses for code {code}: {e}")

        tier = record.get("tier", "standard")
        expires_at = record.get("expires_at") or (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        email = req_data.email.strip().lower() if req_data.email else "guest"
        log_audit(email, "access_code_used", {"code": code, "tier": tier})

        return {
            "msg": f"Code activated! You now have {tier} access.",
            "tier": tier,
            "expires_at": expires_at,
            "success": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating access code: {e}")
        raise HTTPException(500, "An error occurred while validating the code. Please try again.")


# ── Password Reset (OTP-based, uses our own SMTP + Supabase service role) ──
from dependencies import supabase_admin


class ForgotPasswordRequest(BaseModel):
    email: str
    turnstile_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


# email -> {"otp_hash": str, "ts": float, "attempts": int}
_reset_store: Dict[str, dict] = {}


def _send_reset_email(to_email: str, otp: str) -> bool:
    """Email a password-reset code using the same SMTP config as signup."""
    host = os.environ.get("SMTP_HOST")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    if not (host and smtp_user and smtp_pass):
        logger.warning("SMTP not configured; cannot send password reset email.")
        return False
    port = int(os.environ.get("SMTP_PORT", "587"))
    sender = os.environ.get("SMTP_FROM", smtp_user)
    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = "Your AgroIntel password reset code"
    body = (
        f"Namaste!\n\nYour AgroIntel password reset code is: {otp}\n\n"
        "This code expires in a few minutes. If you did not request a password "
        "reset, you can safely ignore this email.\n\n- AgroIntel"
    )
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
            .header {{ background-color: #0f4a29; padding: 24px 32px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px; }}
            .content {{ padding: 32px; color: #333333; line-height: 1.6; font-size: 16px; }}
            .otp-box {{ background-color: #eaf5ee; border: 1px solid #16a34a; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }}
            .otp {{ font-size: 32px; font-weight: 700; color: #16a34a; letter-spacing: 4px; margin: 0; }}
            .footer {{ background-color: #f9fafa; padding: 20px 32px; text-align: center; font-size: 13px; color: #666666; border-top: 1px solid #eeeeee; }}
            .footer a {{ color: #16a34a; text-decoration: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AgroIntel</h1>
            </div>
            <div class="content">
                <p>Namaste Kisaan Bhaiyo,</p>
                <p>We received a request to reset the password for your AgroIntel account. Enter the following code to choose a new password.</p>
                <div class="otp-box">
                    <p class="otp">{otp}</p>
                </div>
                <p style="font-size: 14px; color: #666;">This code will expire in a few minutes. If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>
            </div>
            <div class="footer">
                <p>For any queries, contact us at <a href="mailto:avishkarkedar@gmail.com">avishkarkedar@gmail.com</a> or +91 8432884424.</p>
                <p>Visit our website: <a href="https://avishkark.in">avishkark.in</a></p>
            </div>
        </div>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(body, "plain"))
    msg.attach(MIMEText(body_html, "html"))
    try:
        host_clean = str(host).strip().lower()
        if "resend.com" in host_clean or (smtp_pass and str(smtp_pass).strip().startswith("re_")):
            import urllib.request, json, urllib.error
            req = urllib.request.Request("https://api.resend.com/emails", headers={
                "Authorization": f"Bearer {smtp_pass.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "AgroIntel/1.0"
            }, data=json.dumps({
                "from": sender.strip(),
                "to": to_email,
                "subject": "Your AgroIntel password reset code",
                "text": body,
                "html": body_html
            }).encode("utf-8"))
            try:
                with urllib.request.urlopen(req, timeout=15) as res:
                    pass
            except urllib.error.HTTPError as he:
                logger.error(f"Resend API Error: {he.read().decode('utf-8')}")
                raise he
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(sender, [to_email], msg.as_string())
        logger.info(f"Password reset email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reset email to {to_email}: {e}")
        return False


@router.post("/api/auth/forgot-password")
def forgot_password(req_data: ForgotPasswordRequest, req: Request):
    rate_limit(req, max_req=3, window=300)
    if TURNSTILE_SECRET_KEY:
        if not req_data.turnstile_token:
            raise HTTPException(status_code=400, detail="CAPTCHA token missing. Please refresh and try again.")
        if not verify_turnstile(req_data.turnstile_token, req):
            raise HTTPException(status_code=400, detail="CAPTCHA verification failed.")
    email = req_data.email.strip().lower()
    generic = {"msg": "If an account with that email exists, a 6-digit reset code has been sent to it. Please check your inbox and spam folder."}
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return generic
    registered = False
    if supabase:
        try:
            r = supabase.table("app_users").select("id").eq("email", email).execute()
            registered = bool(r.data)
        except Exception as e:
            logger.warning(f"forgot-password lookup failed: {e}")
    if registered:
        otp = generate_otp()
        _reset_store[email] = {"otp_hash": hash_otp(otp), "ts": time.time(), "attempts": 0}
        if not _send_reset_email(email, otp):
            _reset_store.pop(email, None)
            raise HTTPException(503, "Email delivery is not configured on the server, so the reset code could not be sent. Please contact the administrator.")
    return generic


def _find_auth_user_id_by_email(target_email: str) -> Optional[str]:
    """Resolve a Supabase *Auth* user id from an email address.

    `app_users.id` is a random UUID (gen_random_uuid) that is unrelated to the
    Supabase Auth user id, so it cannot be passed to `update_user_by_id`. Ask
    the Auth admin API for the real id instead, paging through the user list and
    matching on email (case-insensitive). Returns None if not found.
    """
    if not supabase_admin:
        return None
    target = (target_email or "").strip().lower()
    page = 1
    per_page = 200
    supports_pagination = True
    while True:
        try:
            if supports_pagination:
                resp = supabase_admin.auth.admin.list_users(page=page, per_page=per_page)
            else:
                resp = supabase_admin.auth.admin.list_users()
        except TypeError:
            # Some SDK versions don't accept pagination kwargs.
            supports_pagination = False
            resp = supabase_admin.auth.admin.list_users()

        # Normalize the several shapes the SDK can return.
        if isinstance(resp, list):
            users = resp
        elif hasattr(resp, "users"):
            users = resp.users
        elif isinstance(resp, dict):
            users = resp.get("users", resp.get("data", []))
        else:
            users = list(resp) if resp else []

        for u in users:
            u_email = u.get("email") if isinstance(u, dict) else getattr(u, "email", None)
            if u_email and str(u_email).strip().lower() == target:
                uid = u.get("id") if isinstance(u, dict) else getattr(u, "id", None)
                return str(uid) if uid else None

        if not supports_pagination or not users or len(users) < per_page:
            return None
        page += 1
        if page > 50:  # safety cap (~10k users)
            return None


@router.post("/api/auth/reset-password")
def reset_password(req_data: ResetPasswordRequest, req: Request):
    rate_limit(req, max_req=10, window=60)
    email = req_data.email.strip().lower()
    otp = req_data.otp.strip()
    new_password = req_data.new_password.strip()
    if len(new_password) < 6 or len(new_password) > 72:
        raise HTTPException(400, "Password must be between 6 and 72 characters.")
    stored = _reset_store.get(email)
    if not stored:
        raise HTTPException(400, "No reset request found. Please request a new code.")
    if time.time() - stored["ts"] > OTP_EXPIRY:
        _reset_store.pop(email, None)
        raise HTTPException(400, "Reset code expired. Please request a new one.")
    if stored.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        _reset_store.pop(email, None)
        raise HTTPException(429, "Too many failed attempts. Please request a new code.")
    if hash_otp(otp) != stored["otp_hash"]:
        stored["attempts"] = stored.get("attempts", 0) + 1
        raise HTTPException(400, "Invalid reset code. Please try again.")
    if not supabase_admin:
        raise HTTPException(503, "Password reset is unavailable because the admin database is not configured.")
    # Resolve the real Supabase Auth user id for this email (NOT app_users.id),
    # then update the password.
    try:
        uid = _find_auth_user_id_by_email(email)
    except Exception as e:
        logger.error(f"reset-password user lookup failed for {email}: {e}")
        raise HTTPException(500, "Could not reset password right now. Please try again later.")
    if not uid:
        raise HTTPException(404, "No account found for this email.")
    try:
        supabase_admin.auth.admin.update_user_by_id(uid, {"password": new_password})
    except Exception as e:
        logger.error(f"reset-password update failed for {email}: {e}")
        raise HTTPException(500, "Could not reset password right now. Please try again later.")
    _reset_store.pop(email, None)
    log_audit("system", "password_reset", {"email": email})
    return {"msg": "Password reset successfully! You can now log in with your new password.", "success": True}


# ── Profile & Account Management Endpoints ──

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    name: Optional[str] = None
    village: Optional[str] = None


def _get_authenticated_user(req: Request) -> dict:
    """
    Extracts and authenticates the user from the Authorization header (Bearer
    token). Accepts ONLY a valid Supabase Auth access token (verified via
    supabase.auth.get_user) or an app JWT signed with JWT_SECRET. Unsigned or
    spoofable tokens are rejected. Returns dict containing email, user_id (if
    available), and the raw token. Raises 401 if missing or invalid.
    """
    auth = req.headers.get("Authorization", "")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token required")
    token = auth[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token required")
    
    email = None
    user_id = None
    
    # 1. Check with Supabase Auth if client is available
    if supabase:
        try:
            res = supabase.auth.get_user(token)
            if res and hasattr(res, "user") and res.user:
                email = getattr(res.user, "email", None)
                user_id = getattr(res.user, "id", None)
        except Exception:
            pass

    # 2. Check JWT decode using app JWT_SECRET (signature verified)
    if not email and JWT_SECRET:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], options={"verify_exp": True})
            email = payload.get("email") or payload.get("sub")
            user_id = payload.get("id") or payload.get("user_id") or user_id
        except Exception:
            pass

    # SECURITY (2026-07-24): the previous implementation had two dangerous
    # fallbacks here — decoding the JWT with verify_signature=False, and
    # treating any string containing "@" as the authenticated email. Combined
    # with the client sending the raw email as a bearer token, that made the
    # profile and account endpoints effectively unauthenticated (anyone could
    # read/edit/delete any account by sending its email). Both fallbacks are
    # removed. A caller MUST present a token that is cryptographically verified
    # by step 1 (Supabase) or step 2 (app JWT_SECRET) above.

    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")

    return {
        "email": str(email).strip().lower(),
        "id": user_id,
        "token": token
    }


@router.get("/api/user/profile")
def get_user_profile(req: Request):
    user_info = _get_authenticated_user(req)
    email = user_info["email"]
    
    display_name = email.split("@")[0]
    name = display_name
    username = display_name
    village = ""
    created_at = datetime.now(timezone.utc).isoformat()
    
    if supabase:
        try:
            r = supabase.table("app_users").select("*").eq("email", email).execute()
            if r.data:
                row = r.data[0]
                display_name = row.get("display_name") or row.get("name") or row.get("username") or display_name
                name = row.get("name") or display_name
                username = row.get("username") or username
                village = row.get("village") or ""
                created_at = row.get("created_at") or created_at
        except Exception as e:
            logger.warning(f"Failed to fetch profile from app_users for {email}: {e}")
            try:
                r_users = supabase.table("users").select("*").eq("email", email).execute()
                if r_users.data:
                    row = r_users.data[0]
                    display_name = row.get("display_name") or row.get("name") or row.get("username") or display_name
                    name = row.get("name") or display_name
                    username = row.get("username") or username
                    village = row.get("village") or ""
                    created_at = row.get("created_at") or created_at
            except Exception as e2:
                logger.warning(f"Failed to fetch profile from users for {email}: {e2}")

    return {
        "email": email,
        "username": username,
        "display_name": display_name,
        "name": name,
        "village": village,
        "created_at": created_at
    }


@router.put("/api/user/profile")
def update_user_profile(req_data: ProfileUpdateRequest, req: Request):
    user_info = _get_authenticated_user(req)
    email = user_info["email"]
    
    new_display_name = req_data.display_name if req_data.display_name is not None else req_data.name
    new_name = req_data.name if req_data.name is not None else new_display_name
    new_village = req_data.village
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if new_display_name is not None:
        updates["display_name"] = new_display_name.strip()
    if new_name is not None:
        updates["name"] = new_name.strip()
    if new_village is not None:
        updates["village"] = new_village.strip()
        
    if supabase:
        try:
            r = supabase.table("app_users").select("id").eq("email", email).execute()
            if r.data:
                supabase.table("app_users").update(updates).eq("email", email).execute()
            else:
                insert_row = {
                    "email": email,
                    "username": email.split("@")[0],
                    "display_name": updates.get("display_name", email.split("@")[0]),
                    "name": updates.get("name", updates.get("display_name", email.split("@")[0])),
                    "village": updates.get("village", ""),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": updates.get("updated_at")
                }
                supabase.table("app_users").insert(insert_row).execute()
        except Exception as e:
            logger.warning(f"Could not update app_users table for {email}: {e}")
            try:
                r_u = supabase.table("users").select("id").eq("email", email).execute()
                if r_u.data:
                    supabase.table("users").update(updates).eq("email", email).execute()
            except Exception as e2:
                logger.warning(f"Could not update users table for {email}: {e2}")

    return {
        "msg": "Profile updated successfully.",
        "success": True,
        "profile": {
            "email": email,
            "display_name": updates.get("display_name", new_display_name or email.split("@")[0]),
            "name": updates.get("name", new_name or updates.get("display_name", email.split("@")[0])),
            "village": updates.get("village", new_village or "")
        }
    }


@router.delete("/api/user/account")
def delete_user_account(req: Request):
    user_info = _get_authenticated_user(req)
    email = user_info["email"]
    user_id = user_info.get("id")

    # 1. Resolve true Supabase Auth UID first
    client_admin = supabase_admin if supabase_admin else (supabase if hasattr(supabase, "auth") else None)
    if not user_id and client_admin:
        try:
            user_id = _find_auth_user_id_by_email(email)
        except Exception as e:
            logger.warning(f"Could not resolve auth user id for {email}: {e}")
    
    # 2. Delete database records
    if supabase:
        try:
            supabase.table("app_users").delete().eq("email", email).execute()
        except Exception as e:
            logger.warning(f"Could not delete from app_users for {email}: {e}")
        try:
            supabase.table("users").delete().eq("email", email).execute()
        except Exception as e:
            pass

    # 3. Delete from Supabase Auth
    if client_admin and user_id:
        try:
            client_admin.auth.admin.delete_user(user_id)
            logger.info(f"Deleted auth user {user_id} for email {email}")
        except Exception as e:
            logger.warning(f"Could not delete auth user {user_id or email}: {e}")

    log_audit("user", "account_deleted", {"email": email})
    return {"msg": "Account deleted successfully.", "success": True}
