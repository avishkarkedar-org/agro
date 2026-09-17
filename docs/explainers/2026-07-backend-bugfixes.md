# Explainer — Backend correctness fixes + security hardening

> **Part 1** explains three small-but-real backend *correctness* fixes: a broken
> catch‑all error handler (B1), a password‑reset flow that could never succeed
> (B2), and a login screen that only understood Gmail addresses (B3).
>
> **Part 2** covers a batch of *security hardening* changes (S1 code portion, S3,
> S6, S8, S9) plus a real SQL bug fix and documented follow-ups for the items that
> require infrastructure/product decisions (S2 RLS, S5 gating, Cloudflare origin).
>
> Each change is small; the interesting part is *why* each was invisible until you
> looked closely.

---

## Background

### For the newcomer

KrishiSathi's backend is a **FastAPI** application. FastAPI is a Python web
framework where each URL ("route") maps to a function. Around those routes sit
two other kinds of code that matter here:

- **Middleware** — code that runs on *every* request, wrapping the route. The
  app uses one to log metrics (`api_metrics_middleware`) and one to add security
  headers.
- **Exception handlers** — functions FastAPI calls when something goes wrong. The
  app registers a catch‑all `@app.exception_handler(Exception)` so that an
  unexpected crash returns a clean `{"detail": "Internal server error"}` instead
  of leaking a stack trace to the user.

Authentication uses **Supabase**, a hosted Postgres + Auth service. There are two
distinct notions of "user id" that are easy to conflate:

- The **Supabase Auth** user id — created by `supabase.auth.sign_up(...)`. This is
  the id the Auth admin API expects when you later want to change a password.
- A row in the app's own **`app_users`** table, which the app uses to map a
  chosen *username* to an *email*. Its primary key is `id UUID DEFAULT
  gen_random_uuid()` — a brand‑new random value that has **nothing** to do with
  the Auth user id. The only thing linking the two tables is the email string.

### The narrow background (what these functions did before)

1. **`main.py` catch‑all handler.** The handler called `logger.error(...)`, but
   `logger` was never defined at module scope. The *only* place a `logger`
   existed was as a **local variable** created inside the metrics middleware
   (`import logging; logger = logging.getLogger("krishisathi")`). Local variables
   don't leak to module scope, so at the moment the handler ran, `logger` was
   undefined.

2. **`auth.py` `reset_password`.** It looked up `app_users.id` by email and passed
   that id straight to `supabase_admin.auth.admin.update_user_by_id(uid, ...)`.

3. **`auth.py` `auth_login`.** It decided "is this an email or a username?" with
   `if not identifier.endswith("@gmail.com")`.

---

## Intuition

Think of each bug with a concrete example.

**B1 — the handler that crashes while handling a crash.** Imagine a fire alarm
whose job is to call the fire brigade, but the phone number is written on a slip
of paper that only exists inside a *different* room. When the alarm finally goes
off, it reaches for the number and finds nothing. In Python terms:

```python
def middleware():
    logger = logging.getLogger("krishisathi")  # local to middleware only

def handler():
    logger.error("boom")   # NameError: 'logger' is not defined
```

So the very first time a route raised an unexpected error, the handler *itself*
raised `NameError`, and the user never got the tidy 500 message the code was
trying to give them.

**B2 — the right key for the wrong lock.** Two tables, two ids:

```
auth.users:   id = "8f14e45f-...-auth"    email = "ram@yahoo.com"
app_users:    id = "c9a2b3d4-...-random"  email = "ram@yahoo.com"
```

The reset code fetched `c9a2b3d4-...-random` and asked Auth to "update the user
with id c9a2b3d4-...". Auth has no such user, so the update failed every single
time. The fix is to ask Auth *"which user has email ram@yahoo.com?"* and use the
`8f14e45f-...-auth` it returns.

**B3 — a bouncer who only recognizes one ID card.** A farmer signs up with
`ram@yahoo.com`. At login the code checks `endswith("@gmail.com")`; since it's
not Gmail, it assumes the text is a *username*, searches `app_users.username`
for "ram@yahoo.com", finds nothing, and rejects a perfectly valid account. The
fix is to recognize an email by its *shape* (`something@something.tld`), which
works for every provider.

---

## Code

### B1 — give the module a real `logger` (`backend/main.py`)

```python
from dependencies import CORS_ORIGINS, check_maintenance_mode, DATAGOV_KEY, get_supabase, get_supabase_admin

# Module-level logger. The catch-all exception handler and other module-scope
# code below reference `logger`, so it must exist at import time.
logger = logging.getLogger("krishisathi")
```

And the metrics middleware now uses that shared logger instead of re‑creating a
local one:

```python
if request.url.path.startswith("/api/"):
    # Log metrics to stdout instead of unbounded DB tasks
    logger.info(f"API Metrics: {request.method} {request.url.path} - {status_code} - {process_time_ms}ms")
```

Because `logging.getLogger("krishisathi")` returns the *same* singleton that
`dependencies.py` already configured with the JSON handler, the log format stays
identical — we just made the name resolvable everywhere in the module.

### B2 — resolve the real Auth id by email (`backend/routers/auth.py`)

A new helper asks the Auth admin API for the user and matches on email. It is
defensive about SDK differences (list vs `.users` vs dict shapes) and paginates:

```python
def _find_auth_user_id_by_email(target_email: str) -> Optional[str]:
    if not supabase_admin:
        return None
    target = (target_email or "").strip().lower()
    page, per_page, supports_pagination = 1, 200, True
    while True:
        try:
            resp = (supabase_admin.auth.admin.list_users(page=page, per_page=per_page)
                    if supports_pagination else supabase_admin.auth.admin.list_users())
        except TypeError:
            supports_pagination = False
            resp = supabase_admin.auth.admin.list_users()
        # normalize list / .users / dict shapes ...
        for u in users:
            u_email = u.get("email") if isinstance(u, dict) else getattr(u, "email", None)
            if u_email and str(u_email).strip().lower() == target:
                uid = u.get("id") if isinstance(u, dict) else getattr(u, "id", None)
                return str(uid) if uid else None
        if not supports_pagination or not users or len(users) < per_page:
            return None
        page += 1
```

`reset_password` now uses it:

```python
try:
    uid = _find_auth_user_id_by_email(email)   # was: app_users.id
except Exception as e:
    logger.error(f"reset-password user lookup failed for {email}: {e}")
    raise HTTPException(500, "Could not reset password right now. Please try again later.")
if not uid:
    raise HTTPException(404, "No account found for this email.")
supabase_admin.auth.admin.update_user_by_id(uid, {"password": new_password})
```

### B3 — detect emails by shape (`backend/routers/auth.py`)

```python
email = identifier
is_email = bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", identifier))
if not is_email:
    # It's a username — look up the email
    ...
```

---

## Verification

Automated checks run in this session (backend imported with
`GITHUB_ACTIONS=true`, which bypasses the missing DB/JWT secrets):

- **Import / build:** `python -c "import main"` loads cleanly (same check CI runs).
- **B1:** Added a temporary route that raises `RuntimeError`, called it through
  `TestClient(raise_server_exceptions=False)`, and asserted the response is
  `500` with body `{"detail": "Internal server error. Please try again."}` — and
  that the handler logged instead of throwing `NameError`.
- **B2:** Unit‑tested `_find_auth_user_id_by_email` with fake SDK clients:
  paginated match on page 2 (returns the correct Auth id), case‑insensitive
  match, "email absent → None", and the `TypeError` fallback with dict‑shaped
  users.
- **B3:** Asserted the email regex accepts `user@gmail.com`, `user@outlook.com`,
  `farmer.singh@yahoo.co.in` and rejects `avishkar`, `ram_123`, `not@anemail`.

### Manual QA

1. **B3 (login):** Register a user with a **non‑Gmail** email (e.g. Outlook). Log
   out, then log in using that email. Before the fix this failed with "invalid
   username or password"; now it succeeds. Also confirm logging in by *username*
   still works.
2. **B2 (reset):** Use "Forgot password", enter the OTP, set a new password for a
   real account, and confirm you can log in with the new password. Requires
   `SUPABASE_SERVICE_ROLE_KEY` and SMTP configured on the server.
3. **B1 (errors):** Trigger any server error and confirm the response is the
   clean JSON message and the server log shows a single `Unhandled error ...`
   line (no secondary `NameError`).

---

## Alternatives

**B2 — how to map email → Auth id**

| Approach (chosen): look up via Auth admin `list_users` | Alternative: store the Auth id in `app_users` at signup |
|---|---|
| ✅ Works for **all existing** users immediately | ✅ O(1) lookup, no paging |
| ✅ No schema/data migration | ✅ Cleaner long‑term data model |
| ❌ Pages through users (O(n)); fine at current scale | ❌ Needs a migration to backfill existing rows |
| ❌ Depends on SDK `list_users` behavior | ❌ New signups only until backfilled |

The chosen fix is backward‑compatible today; adopting the alternative later (set
`app_users.id`/a new column to the Auth id at signup) would let the helper become
a fast direct lookup.

**B1 — where to define the logger**

| Chosen: module‑level `getLogger("krishisathi")` | Alternative: `from dependencies import logger` |
|---|---|
| ✅ Zero new coupling; same singleton | ✅ Explicit single source of truth |
| ✅ Minimal diff | ❌ Adds another symbol to the dependencies import surface |

---

## Suggested people to talk to

Every commit that has touched `backend/main.py` and `backend/routers/auth.py` was
authored by **AvishkarKedar** (the repo owner) — e.g. *"security: apply Wave 1
and Wave 2 fixes for auth, JWT, admin passwords…"* and *"Wave 3 & 4: Fix backend
correctness, CORS, metrics middleware…"*. There are no other contributors in the
history, so Avishkar is the sole domain expert on the auth flow and the metrics
middleware. Because much of this code appears to have been produced in large
AI‑assisted "wave" commits, it's worth a careful self‑review of the Supabase Auth
↔ `app_users` relationship in particular, since that mismatch is what caused B2.

---

## Quiz

<details>
<summary>1. Why did the catch‑all exception handler fail before the fix?</summary>

- A) FastAPI doesn't allow `@app.exception_handler(Exception)`
- **B) `logger` was only a local variable inside the middleware, so it was undefined at module scope when the handler ran** ✅
- C) The handler returned the wrong status code
- D) `logging` was never imported

`logging` *was* imported; the problem was that `logger` was created as a local
inside `api_metrics_middleware`, which does not create a module global. The
handler referenced a name that didn't exist → `NameError`.
</details>

<details>
<summary>2. Why could password reset never succeed before?</summary>

- A) The OTP always expired too fast
- B) `update_user_by_id` is deprecated
- **C) It passed `app_users.id` (a random UUID) instead of the Supabase Auth user id** ✅
- D) The service role key is never configured

`app_users.id` defaults to `gen_random_uuid()` and is unrelated to the Auth user
id; the two tables are linked only by email.
</details>

<details>
<summary>3. What does the new email detector consider a valid email?</summary>

- A) Anything ending in `@gmail.com`
- B) Any string containing `@`
- **C) `something@something.tld` — non‑space, `@`, non‑space, dot, non‑space** ✅
- D) Only addresses present in `app_users`

The regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` requires a local part, `@`, a domain, and a
dot‑TLD, which is why `not@anemail` (no dot) is rejected.
</details>

<details>
<summary>4. Why does `_find_auth_user_id_by_email` catch `TypeError`?</summary>

- A) To ignore users with malformed emails
- **B) Some Supabase SDK versions' `list_users` don't accept `page`/`per_page` kwargs; on `TypeError` it retries without them** ✅
- C) Because `list_users` can return `None`
- D) To stop infinite pagination

It sets `supports_pagination = False` and falls back to a no‑argument call, then
processes that single page.
</details>

<details>
<summary>5. Why does logging format stay unchanged after the B1 fix?</summary>

- A) Because the middleware still creates its own logger
- **B) `getLogger("krishisathi")` returns the same singleton that `dependencies.py` already configured with the JSON handler** ✅
- C) Because FastAPI reformats all logs
- D) It doesn't — the format changed to plain text

Python's `logging.getLogger(name)` always returns the same instance for a given
name, so the module‑level logger inherits the JSON handler configured elsewhere.
</details>

---

# Part 2 — Security hardening

## Background

These changes came out of the security review. None of them changes behavior for
legitimate users; they close (or document) ways the app could be abused.

- **Client IP trust (S1).** Rate limiting and IP bans key off `_get_client_ip`.
  The origin (`*.onrender.com`) is reachable *directly*, not only through
  Cloudflare, so any header the code trusts can be forged by hitting the origin
  straight on.
- **Response headers (S3).** The API and the two static sites shipped several
  headers but no `Strict-Transport-Security` and no `Content-Security-Policy`.
- **`/api/track` (S6).** An unauthenticated endpoint wrote a row into the admin
  `audit_logs` table on every call.
- **`/api/debug/cors` (S8).** Returned `jwt_secret_len` — a hint about a secret.
- **`/api/geocode` (S9).** Concatenated the raw `q` into the Nominatim URL.
- **`setup_database.sql` (S2).** Used `CREATE POLICY IF NOT EXISTS`, which is not
  valid PostgreSQL and aborts the script.

## Intuition

The theme is *"don't trust the client, and don't hand out capabilities you didn't
mean to."* A forged `X-Real-IP` is like showing up to a members-only club wearing
someone else's name tag; an unauthenticated write into the audit log is like
leaving the club's official logbook on the street with a pen next to it. And
`CREATE POLICY IF NOT EXISTS` is simply a sentence Postgres can't parse — the
whole setup script stops there.

## Code

**S1 — prefer the CDN-controlled header (`dependencies.py`).** Trust
`cf-connecting-ip` first (Cloudflare overwrites it at the edge), then fall back to
`x-real-ip` / `x-forwarded-for` only as best-effort. A comment spells out that
this is *not* airtight until the origin only accepts Cloudflare traffic.

**S3 — HSTS + a non-breaking CSP baseline.** Added to the API responses
(`main.py`) and to both `public/_headers` files:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
```

This CSP deliberately does **not** restrict `script-src`/`style-src`/`connect-src`
yet, because the frontend uses inline styles, an inline PWA registration, Google
Translate, Turnstile, YouTube embeds, and direct Open‑Meteo calls — a strict
policy needs real browser testing first (the exact allow-list is noted as a
follow-up). What it *does* add is free and safe: anti-clickjacking, no plugins, no
`<base>` injection, and constrained form posts.

**S6 — `/api/track` logs to stdout** instead of `log_audit(...)`, so anonymous
callers can no longer flood/poison `audit_logs`.

**S8 — `/api/debug/cors`** no longer returns `jwt_secret_len` (only booleans).

**S9 — `/api/geocode`** passes `params={"q": q, ...}` to httpx so the query is
URL-encoded and can't inject extra parameters.

**S2 — `setup_database.sql`** now uses `DROP POLICY IF EXISTS ...; CREATE POLICY
...` (idempotent + valid), and a "RECOMMENDED HARDENING" block documents how to
scope the sensitive-table policies to `service_role` *after* the backend is moved
to the service-role client (doing it before would lock the backend out).

## Verification

- Backend import check passes; `TestClient` confirms `/health` carries the CSP +
  HSTS headers and the catch-all still returns clean JSON.
- Unit checks: `_get_client_ip` returns the `cf-connecting-ip` when present and
  falls back correctly; `debug_cors` source no longer contains `jwt_secret_len`;
  `track_feature` no longer calls `log_audit`.
- `setup_database.sql` reviewed for valid syntax (no `CREATE POLICY IF NOT
  EXISTS`).

### Manual QA
1. `curl -I https://<api>/health` → see `Strict-Transport-Security` and
   `Content-Security-Policy`. Do the same against the Pages/admin sites.
2. Exercise the app end-to-end (scan, weather, mandi, language switch, YouTube
   explainer, login/Turnstile) and confirm nothing is blocked by CSP in the
   browser console. If something is, it means the strict follow-up CSP must add
   that host — the baseline here should not block anything.
3. POST `/api/track` and confirm no new `audit_logs` row appears.

## Follow-ups that need YOUR environment (not in this PR)

These can't be safely done from a code sandbox because they need your Cloudflare
config, your Supabase database, or a product decision:

- **S1 (finish it):** lock the Render origin to Cloudflare-only (Authenticated
  Origin Pull or Cloudflare IP allowlist). Until then, IP spoofing is still
  possible by hitting the origin directly.
- **S2 (finish it):** switch the backend's privileged calls from the anon client
  to `supabase_admin`, then apply the tightened RLS policies in the hardening
  block. Needs testing against the live DB.
- **S5:** enforce premium/access-code entitlement server-side (today it's
  localStorage-only). This is a product decision about which endpoints are gated.
- **Full CSP:** promote the baseline CSP to a strict `script-src`/`connect-src`
  policy after browser testing (allow-list: self, the backend origin + `wss:`,
  `api.open-meteo.com`, `geocoding-api.open-meteo.com`, `challenges.cloudflare.com`,
  `www.youtube.com`, `fonts.googleapis.com`/`fonts.gstatic.com`, and the Google
  Translate hosts).
- **B4/B5:** decide whether to re-introduce bounded writes to `api_metrics`/
  `visitors` or remove the admin dashboards that read them.
