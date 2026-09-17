# CONTEXT_RECENT.md

**Addendum to `CONTEXT.md`, which is current only to R129.**

This file exists because `CONTEXT.md` is ~852 lines - above the safe whole-file
push band - and there is no patch operation. Editing it means reproducing all
852 lines from memory, which risks the one document that prevents repeat
incidents. **Merge this in during the `CONTEXT_REFERENCE.md` split (pending
task 7), then delete this file** - `delete_file` exists, see correction 1.

Written 5 Aug 2026. HEAD at time of writing: `237811f1`.

---

## Part 1 - Four corrections to beliefs we have been acting on

These are listed first on purpose. Two of them have been blocking work for
multiple sessions, and one made a prior status report wrong.

### Correction 1: files CAN be deleted

Multiple sessions recorded "`push_files` **cannot delete**" and treated dead
code as unremovable. `push_files` indeed cannot, but a separate **`delete_file`**
tool exists and always has. Also available and previously unrecorded:
`create_or_update_file` (single file, requires the blob sha).

**Consequence:** the inert selectors deliberately left in place under KL#34
(`.header-right .badge-live`, `.badge-live`/`.live-dot`,
`#google_translate_element_mobile`) are removable. So are the four dead handlers
in `admin.py` (issue 21) once their routes are confirmed unreachable.

### Correction 2: `get_commit` CAN return the diff

KL#68 said `get_commit` returns "no patch text, only stats". Wrong - it takes a
**`detail`** parameter accepting `"none"`, `"stats"` (the default, which is what
we kept passing) and **`"full_patch"`**.

**Consequence:** every "verified" claim in this repo's history was verified by
*line-count ratio only* (KL#52). That is a truncation check, not a correctness
check - it cannot see a mangled string or a broken JSX attribute. Use
`detail: "full_patch"` from now on. Line ratios were never wrong, just weak.

### Correction 3: BYTE SIZE IS NOT THE PUSH CEILING - LINE COUNT IS

This is the expensive one. Files were being marked "TOO BIG TO PUSH" on **byte
size**, but the ceiling (KL#15) is ~720-760 **lines**.

`src/components/AIVoiceAssistant.jsx` is **26,470 bytes** and was labelled
"TOO BIG, needs the file split first" across at least four sessions. It is
**~460 lines**. It pushed whole in R132 with a clean 18+/6- diff. The byte count
is high because it contains ~50 very long single-line CSS declarations.

**Consequence - these were probably never blocked:**

| File | Bytes | Previously | Reality |
|---|---|---|---|
| `AIVoiceAssistant.jsx` | 26,470 | "too big" | **~460 lines, PROVEN pushable (R132)** |
| `Community.jsx` | 26,011 | "too big" | likely pushable - count lines first |
| `Weather.jsx` | 28,712 | "too big" | likely pushable - count lines first |
| `MandiPrices.jsx` | 29,503 | "too big" | likely pushable - count lines first |
| `redesign.css` | 29,823 | "too big" | CSS: long lines, count first |
| `admin.py` | 42,992 | "too big" | Python: probably genuinely over |
| `ai.py` | 33,527 | "too big" | Python: probably genuinely over |

**Check line count before declaring anything unpushable.** Several deferred
items were deferred for no reason - including R126's decision to fix the voice
assistant from `redesign5.css` with `!important` instead of editing the
component, and the `ai.py` Pune-default complaint the owner has raised twice.

Python files are the ones to still be careful with: dense, short lines, so bytes
and lines track much more closely than in JSX or CSS.

### Correction 4: CI STATUS CANNOT BE CHECKED FROM HERE

There is **no workflow/Actions tool** in this GitHub connection. No
`list_workflow_runs`, no `get_workflow_run`, no job logs. `pull_request_read`
offers `get_check_runs` but requires a PR number, and everything here is pushed
straight to `main`.

**Consequence:** "the build is green" can never be stated from this side. It is
an owner-side check (GitHub Actions tab / Cloudflare Pages dashboard). This does
not change KL#28 - green CI only ever proved compilation anyway.

---

## Part 2 - Revision log R130-R132

### R130 - `2be74a92` - AuthModal accessibility (`AUTH_A11Y_R130`)

`src/components/AuthModal.jsx`, verified 41+/33-.

Replaced a hand-rolled focus trap with the existing `useFocusTrap(mode, onClose)`
hook. The local version was worse in three specific ways, not merely duplicated:
its selector omitted `a[href]` so the Terms and Privacy links were unreachable
by Tab; it cached the focusable list once per mode, so it went stale as buttons
flipped between enabled and disabled; and it bound Escape to the modal node, so
Escape did nothing once focus left the box.

Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby`,
and `role="alert"`/`role="status"` on the banners.

**KL#81** - one present ARIA attribute disguises the missing ones. The close
button already had `aria-label="Close login modal"`, which made the absent
`role`/`aria-modal` look handled in review.

Class names untouched on purpose (KL#36): R127 and R129 both key off
`.auth-terms`, `.auth-link`, `.modal-close`.

### R131 - `59c488a9` - community/marketplace: three live defects (`COMMUNITY_OWNERSHIP_R131`)

`backend/routers/community.py`, verified 102+/30-.

**1. Every reply in the community was invisible to everyone.** `GET /api/posts`
filtered replies out with `.neq("tag", "Reply")`, while `Community.jsx` derives
its reply list *from that same array* (`posts.filter(p => p.tag === "Reply")`).
That can never match. Post cards printed `{p.replies} replies` from the counter
column - which `reply_post` faithfully increments - so a post advertised "3
replies" and rendered none. A reply was visible only to its author, only until
they refreshed. `GET /api/posts/{id}/replies` exists, returns exactly the right
data, and has never been called by anything (KL#39).

Fixed server-side: two queries, `_MAIN_POST_LIMIT = 200` and
`_REPLY_LIMIT = 500`, so replies can never crowd main posts out of the 200 the
way one combined query would. Chosen over the arguably-more-correct client fix
because `Community.jsx` was believed unpushable - see correction 3, that belief
was probably wrong.

**2. Deleting a listing returned 500 and told the farmer it worked.**
`delete_post` ran `select("author,user_email")` and **`posts` has no
`user_email` column** (repo-wide search: two hits, this file and an unrelated
`user_access_codes` table). PostgREST rejects it, the bare `except` became a
500 - and `KrishiMarket.deleteListing` only catches a *thrown* fetch, which a
500 is not, so it fell through to `loadMarket()` and toasted "Listing deleted".
Now `select("*")` + `.get("user_email")`, which yields `None` on a schema
without the column rather than erroring. Needs no migration to stop the 500.

**3. `/sold` and `/edit` had no token check at all.** They compared the
client-supplied `author` - a display name `GET /api/posts` hands out publicly -
and nothing else. Anyone could overwrite another farmer's listing or stamp
`[SOLD]` on it. All three endpoints now share `_assert_can_modify()`.

**4.** `reply_post`'s INSERT was the only unwrapped write in the file.

**STILL OPEN, STATED PLAINLY:** ownership is *still* a public-name comparison.
The email branch is dormant because no row can carry `user_email`, and it was
deliberately **not** added to any INSERT - writing to a missing column breaks
posting outright. Two ordered steps to close it (KL#65 - backend first, so the
intermediate state is degraded rather than broken):

1. `ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_email TEXT;` **(owner - not
   done as of 5 Aug)**
2. store the verified email in `create_post`, and make `KrishiMarket.jsx`
   (15,018 B, pushable) send `Authorization: Bearer agrointel_token` on
   create/edit/sold/delete - it currently sends **none**.

**KL#82** - a client that ignores status codes turns a server 500 into a success
toast. Check how the caller handles failure, not just whether it has a `catch`.

**KL#83** - a defensive branch keyed on a column that does not exist is dead
code *and* an error source. `select("*")` + `.get()` survives a schema that
lacks it.

### R132 - `237811f1` - finish the rename in Hindi + Marathi (`BRAND_I18N_R132`)

`AIVoiceAssistant.jsx`, `public/robots.txt`, `public/sitemap.xml`. Verified
21+/9- total, 18+/6- on the component.

The KrishiSathi -> AgroIntel rename only ever touched the `en-IN` strings.
Hindi and Marathi still showed the old brand in the voice panel title and on
the speaker label above **every** assistant reply.

**Why it survived every previous audit:** the strings are Devanagari,
`कृषिसाथी`. A Latin-script search for "KrishiSathi" returns six hits, none of
them UI text. **When auditing a rename in a multilingual app, search each
script separately** - searching `साथी` is what found it.

Brand is now `AgroIntel` in Latin in all three locales. A Devanagari
transliteration (`अ‍ॅग्रोइंटेल`) was deliberately not used; owner decision,
two strings per locale to change.

Also fixed, same file: `.ksv-msg-who` applied `text-transform:uppercase` +
`letter-spacing` to the speaker label. Uppercase is a no-op on Devanagari and
letter-spacing breaks its conjuncts, so `आप`/`तुम्ही` rendered badly. New
`.ksv-msg-who-deva` class turns both off when `lang !== "en-IN"`; English
`YOU`/`AGROINTEL` styling unchanged. This closes the "known, unfixed, needs the
file split" note in `CONTEXT.md` section 3.

SEO: `robots.txt` and `sitemap.xml` pointed search engines at
`krishisathi.pages.dev`, a domain that is no longer the site. Repointed at
`agrointel.pages.dev` - **a guess**; if `avishkarkedar.app` is canonical, those
two files are where to change it.

---

## Part 3 - Old name still present (audited 2 Aug, all six hits)

| Location | Visible to | Status |
|---|---|---|
| `settings.site_title` **DB row** | every user, all languages | **OWNER - admin panel. No push can fix a stored value.** |
| `setup_database.sql` default + header | future installs only | open |
| `admin-panel/.../AdvancedSettings.jsx` Hindi TTS greeting default | admin, and farmers if saved | open - see note below |
| `package-lock.json` `"name"` | nobody | cosmetic |
| `README.md` subtitle `(कृषि-साथी)` | repo visitors | arguably intentional |
| `backend/main.py` logger name `"krishisathi"` | logs only | cosmetic |

**On `AdvancedSettings.jsx`:** deliberately not fixed. It is ~600 lines of
deeply nested JSX and the defect is one default string that `loadData()`
overwrites from the API on mount. With no patch operation, changing it means
reproducing 600 lines verbatim - the transcription risk exceeds the value.
Worth doing when that file is being edited for another reason.

---

## Part 4 - Owner-side blockers as of 5 Aug 2026

1. **`ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_email TEXT;`** - blocks
   the real fix for listing ownership. Marketplace edit/sold/delete authority
   is a public-name comparison until this runs.
2. **`site_title` in the admin panel** - likely still says KrishiSathi.
3. **`llama-3.3-70b-versatile` shuts down 16 Aug 2026 - 11 days out.** Owner
   chose to keep it (that was reasonable at the time). Replacement candidate
   `openai/gpt-oss-120b` at ~1,000 RPD vs `llama-3.1-8b-instant` ~14,400 RPD.
   The AI stops answering if this date passes untouched.
4. **Canonical domain** - `agrointel.pages.dev` (assumed in R132) or
   `avishkarkedar.app`?
5. **Font: Space Grotesk vs Playfair** - three files hardcode
   `"Playfair Display"`; owner has called this the top unblocker twice.
6. **Desktop liquid glass >769px** - keep or remove. Pointer devices only, so
   ~5% of users.

## Part 5 - Awaiting an owner look (nothing here is verified)

No visual or behavioural fix in this project has ever been verified from this
side. Highest value first:

- **Community replies appear after a refresh** (R131) - was a feature-level
  outage for all users.
- **Delete your own marketplace listing, then refresh** (R131) - previously
  claimed success and left the row.
- **Voice assistant in हिं and मर** (R132) - title, speaker label, and whether
  `आप`/`तुम्ही` still look letter-spaced.
- R130 keyboard/screen-reader pass; R129 login modal on a phone; R128 sidebar;
  R127 dark + high-contrast; the full UI once in मराठी; ticker through one
  full loop; footer; admin AI Usage / Feature Usage / Heatmap **after the Render
  backend wakes (~2 min on free tier - do not judge it broken before then)**;
  toggling a feature off and confirming it leaves the welcome banner.
