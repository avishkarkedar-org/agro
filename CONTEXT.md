# AgroIntel - Working Context

**Last updated:** 2026-07-26 (R129) | **HEAD at write time:** `d9a572de`

---

## 0. START HERE (cold start / new chat session)

Two handover documents, in this order:

1. **`CONTEXT.md`** (this file) - architecture, the boot path, the modal
   contract, the stylesheet procedure, hard-won lessons, outstanding issues,
   revision log. **This is the one that prevents repeat mistakes.**
2. **`CONTEXT_REFERENCE.md`** - cold-start lookup data: owner's standing
   instructions, the GitHub tool cookbook, file inventories with blob SHAs.

**The six things most likely to bite you:**

- **A blank screen is usually the service worker, not your diff** (KL#74). Two
  deploys minutes apart under PWA `skipWaiting` can strand clients on a cached
  `index.html` pointing at purged asset hashes. **Suspect this before the diff
  when `#root` is empty with no error UI.**
- **Space your deploys** and confirm a good load between them. The 26 Jul
  incident is permanently ambiguous because two pushes went out five minutes
  apart (see section 3, boot path).
- Removing a stylesheet import silently un-styles components (KL#34).
- `.modal` is a fullscreen overlay, **not** a dialog box (KL#36).
- Pushes over ~720-760 lines truncate silently (KL#15). Verify with
  `get_commit` and check the additions-vs-deletions ratio (KL#52). **This file
  is at that ceiling** - trim while rewriting (KL#73).
- **A green build proves nothing about CSS or runtime** (KL#28). Never tell the
  owner a visual or AI fix is verified - ask them to hard-refresh and report.

**A comment in the code can be a lie.** `ds-tokens.css`'s header says the four
`redesign*.css` files "are no longer loaded". **That is false at HEAD** - R97
re-imported all four. Verify architectural claims against `main.jsx`, not
against comments (KL#78).

**Update this file every session.** It has twice been allowed to fall many
revisions behind, during which it actively described an architecture and a model
configuration that no longer existed. It has also **contained outright fiction**
(see "Closed as never-broken" in section 8).

---

## 1. Live surfaces

| What | Where |
| --- | --- |
| Frontend | `https://agrointel.pages.dev` / `https://avishkarkedar.app` (Cloudflare Pages) |
| Backend | `https://agrointel-backend-ucic.onrender.com` (Render, FastAPI) |
| Admin panel | `https://admin.avishkarkedar.app` |
| Database | Supabase project `jbmmtcaqgestwykolaad` |
| Repo | `avishkarkedar-org/AgroIntel`, default branch `main` |

`main` auto-deploys to **both** Render and Cloudflare. No staging - every push is
production. A failed Cloudflare build keeps the last good deploy, so a broken
build degrades to "stale site", not "dead site" - **which is why a black screen
is never a failed build.** Render free tier spins down after ~15 min idle; first
request after that takes ~30-60s. **That sleep also wipes every in-memory
counter** - `_task_last_run`, `_ai_usage`, the rate-limit windows and the metrics
buffer all reset, which makes several admin pages read like the system is idle or
broken when it is fine (issue 22).

**95% of users are on smartphones.** This is the owner's standing instruction and
it decides trade-offs: boot round trips, font bytes, touch targets, GPU cost and
offline recovery all outrank desktop polish.

**Stack:** React 18 + Vite 8 (rolldown) + React Router 6 + lucide-react +
Recharts + zustand, PWA via `vite-plugin-pwa`. Backend FastAPI + Supabase + Groq.

---

## 2. Stylesheet architecture - READ THIS FIRST

### Current load order - EIGHT files

```
src/main.jsx
  -> styles/global.css        structure only (R96 rewrite, no theming)
  -> styles/ds-tokens.css     token scale + legacy token bridge
  -> styles/ds-components.css component baseline
  -> styles/redesign.css      R81-R86        <-- legacy, still REQUIRED
  -> styles/redesign2.css     R88-R91        <-- legacy, still REQUIRED
  -> styles/redesign3.css     R91.1-R93      <-- legacy, still REQUIRED
  -> styles/redesign4.css     R94,R100-R104  <-- legacy, still REQUIRED
  -> styles/redesign5.css     R108-R129      <-- LIVE, loads LAST
```

**The four `redesign*.css` files are load-bearing. Do not remove them again
without following the migration procedure below.** New global CSS goes in
**`redesign5.css`** (fourteen sections as of R129). `redesign4.css` is at its own
practical limit with seventeen numbered blocks. **`redesign.css` is 29,823 bytes
- too big to push whole**, which is why redundancies inside it are left alone.

**`ds-tokens.css`'s header comment claims the four `redesign*.css` files "are no
longer loaded". IT IS WRONG** - it describes the R95 state, which R97 reverted,
and nobody updated it. It also documents three mutually exclusive design
languages coexisting, which is accurate. **Trust `main.jsx`** (KL#78).

### The R95 -> R97 incident (still the most important thing in this file)

R95 removed the four `redesign*.css` imports, assuming the design system replaced
them. **It did not.** Those files were not purely overrides - for some components
they were the *only* source of styling, so every component whose classes appeared
nowhere else rendered bare. `.home-hero` is confirmed: `HomeHero.jsx` renders it,
styled only in `redesign2.css`/`redesign3.css`.

Owner's report: *"crashed website many thing destructed."* Nothing crashed and
**the build stayed green** - structurally fine, visually destroyed. R96.1/R96.2
had already found two *variables* orphaned the same way; assuming that was the
whole job was the error, because whole **selectors** were orphaned too. R97
restored all four imports: design system first for tokens and baseline, legacy
sheets after so they win where they overlap.

### What the legacy sheets contain (read in full: R100, R127)

- **`redesign.css`** - R81 flat-editorial tokens, R82 glass-token remap, R83
  vibrancy, R85 the premium dual palette **and the whole `.home-hero` block**,
  R86 the news ticker. Also `@import`s Inter + Space Grotesk, sets `--sans`, and
  re-points **`--serif` to Space Grotesk** with
  `h1,h2,h3,h4{font-family:var(--serif)!important}`. **It loads after
  `global.css`, so it wins.**
- **`redesign2.css`** (read in full, R127) - R88 deep-dark/warm-light palette,
  hero orbs, footer list; R91 wide canvas and **desktop-only liquid glass**
  (`@media (hover:hover) and (min-width:769px)`, applied to `.card`,
  `.modal-content`, `.header`, `.drawer`, `.home-hero`). **It re-declares
  `--surface` / `--clay-surface` / `--clay-bg` in `:root`, overriding
  ds-tokens' deliberate re-pointing** - the cause of the R127 defect below.
  Hides the header Live pill via `.header-right .badge-live{display:none!important}`
  - **now inert** (R119 deleted the markup); drop the selector next time this
  sheet is edited.
- **`redesign3.css`** - R91.1 nested-glass repair, R91.2 `.grid` to CSS Grid,
  R92.2 contrast raise + 16px base, R93 de-terminal pass **and the per-feature
  icon chips**.
- **`redesign4.css`** - R94 typography (mono demoted to digits), R100 cascade
  repairs, R101 dialog-scroll fix + `.chip.cx`, R102.1 colour completion, R104
  weather panel tokens. **Seventeen numbered blocks.**
- **`redesign5.css`** - **fourteen sections**: 1 control metrics (with the
  R108.1 border warning), 2 chips, 3 icon sizing, 4 `.modal-close`, 5 form
  rhythm, 6 mobile 44px floor + 16px iOS anti-zoom, 7 `:focus-visible` ring,
  8 disabled state, 9 `FOOTER_ALIGN_R118`, 10 `TICKER_LOOP_R120`,
  11 `VOICE_CARD_R126`, 12 `SURFACE_TOKENS_R127`, 13 `DRAWER_MOBILE_R128`,
  14 `TOUCH_TARGETS_R129`. Heights in sections 1-5 are deliberately **not**
  `!important` so components can opt out; sections 9-14 must use it (they
  outrank an existing `!important` or a component-injected `<style>`). Border
  metrics apply to `input`/`select`/`textarea` **only** (KL#47).

### One surface scale, and how it split in two (R127)

`ds-tokens.css` could not delete the `--clay-*` tokens, because six components
write `var(--clay-surface)` in **inline styles and injected `<style>` blocks**
where no stylesheet edit reaches them (`SettingsModal`, `ProfileModal`,
`AuthModal`, `AIVoiceAssistant`, `SidebarDrawer`, `App`). So it re-pointed them:
`--clay-surface: var(--ds-surface)`. Correct call - but **`redesign2.css` loads
after it and re-declares the same names**, so dark mode ran two scales at once:
`--s1` `#121815` for `.card` versus `--clay-surface` `#0a0d0b` for eight other
surfaces. Cards and drawers were never the same colour. That is the owner's
report *"the claymorphism was removed so some of the UI and elements were
conflicted"*. **`redesign5.css` section 12 restores the re-pointing from the
last sheet in the load order**, listing `:root, html.light, html.contrast`
explicitly for specificity reasons documented in the file.

The same read found that **contrast mode** kept `#0a0d0b` panels on a `#000`
page, because nothing redeclared `--clay-surface` under `html.contrast` - so the
high-contrast theme, the one low-vision users pick, had off-black boxes on black.

**Still undecided:** R91's desktop glass covers only five selectors, so above
769px translucent cards sit beside opaque panels (`.ksv-card`, the shell
prompts). Either extend glass or remove it. Pointer devices only; ~5% of users.

### Migration procedure - the ONLY safe way to retire a sheet

1. Pick **one** file.
2. Enumerate **every selector** it defines.
3. Confirm `ds-components.css` covers each; port the missing ones **first**.
4. Confirm every custom property it declares exists elsewhere, and check
   consumers - `var(--x)` with no fallback drops the whole declaration.
5. Only then remove that one import.
6. Deploy and check the live site. **One file per deploy, never more.**

### Modal class contract (R98 - get this right)

| Class | What it actually is |
| --- | --- |
| `.modal-overlay`, `.modal-bg` | Full-screen backdrop, `position:fixed; inset:0`, centres its child. |
| `.modal` | **ALSO a full-screen overlay** - fixed, inset 0, flex-centred. **NOT a dialog box.** |
| `.modal-content` | **The dialog box.** `max-width:440px`, `position:relative`, `overflow:hidden`, surface/border/radius/shadow, plus the `<=600px` bottom-sheet treatment. |

Using `.modal` as the box fails twice at once: `display:flex` in row direction
turns close button, heading and body into **siblings in a row**, and
`position:fixed; inset:0` plus an inline `max-width` pins the box to the left
edge at full height. The mobile bottom-sheet rules never match either, because
they target `.modal-content`.

**Correct structure:**

```jsx
<div className="modal-overlay open">
  <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="...">
    <button className="modal-close" style={{ position: "absolute", top: 12, right: 12 }} />
  </div>
</div>
```

`.modal-close` carries **no positioning of its own** - the dialog positions it,
which is safe because `.modal-content` is `position:relative`. Give the heading
`padding-right: ~44px`. **It is 34x34 by default and 44x44 below 600px** as of
R129; see KL#79 for why the old safety net missed it.

**`.card` is also a valid dialog box** and several dialogs use it
(`AccessCodeModal`, `AuthModal`, `ConfirmHost`, `OnboardingTutorial`,
`scan/ScanHistory`) - **but see KL#37 and KL#42**: `.card` is
`overflow:hidden !important`, which clips anything positioned outside it and,
until R101, made tall dialogs impossible to scroll.

### Why the stack was a problem at all

Up to R94 the app loaded five sheets carrying twelve revisions of **three
mutually exclusive design languages**: glass -> clay -> flat editorial -> glass
again, each partially undoing the last. **The diagnosis was right; the mistake
was the migration method.** R100 and R127 both proved the pattern still produces
live defects - a pass adds a rule or a token and a later pass never removes it.

**Theming to `ds-components.css`. Tokens to `ds-tokens.css`. Layout and utility
to `global.css`. New global fixes to `redesign5.css`.**

### Design language (owner: "do it acc to you")

Quiet editorial. One surface tone, hairline borders, one restrained shadow, green
reserved for action and status. No clay, no glass, no glow. Depth from surface
elevation plus a 1px border, never ornament. An instrument, not a toy.

Clay tokens now resolve to the ds scale (R127). Desktop glass is still live above
769px and undecided.

### Typography rule

**Monospace is for digits only** (`.clock`, `.tx-num`, `.fert-num`, `.mono`,
`.big-temp`, `tabular-nums`). Before R94 `var(--mono)` was the primary UI face,
which read as a dev console and silently broke Hindi/Marathi: IBM Plex Mono has
no Devanagari coverage and `text-transform:uppercase` is a no-op for Devanagari.
**Never uppercase or monospace Devanagari.** (`AIVoiceAssistant`'s `.ksv-msg-who`
still uppercases and letter-spaces `आप`/`कृषिसाथी` - known, unfixed, needs the
file split.)

### Touch targets - the sweep is CLOSED (R126, R128, R129)

Section 6's 44px mobile floor selects `.btn` and the input classes **only**, so
it never reached components that style bespoke class names inside their own
injected `<style>` (KL#75). Rather than guess, `search_code` bounded the set:
**exactly four farmer-app components inject a `<style>` block** -
`SidebarDrawer`, `ProfileModal`, `AuthModal`, `AIVoiceAssistant` (`SplashScreen`
does too, but has no controls). **All four have now been read in full.**

| Component | Found | Fixed |
| --- | --- | --- |
| `AIVoiceAssistant` | `.ksv-close` 32px, `.ksv-lang` 28px, clay card shadow | R126 §11 |
| `SidebarDrawer` | `.drawer-close` 40px + an **invisible blur** (below) | R128 §13 |
| `ProfileModal` | nothing - uses the shared `.btn`/`.input`/`.modal-close` | n/a |
| `AuthModal` | `.auth-link` ~26px ("Forgot password?", "Resend OTP", every "Back") | R129 §14 |

`.modal-close` was 34x34 on **every** modal in the app - one shared class, one
fix (R129). **Deliberately left small:** the terms checkbox (18x18, but its
`<label>` is `htmlFor`-bound so the whole sentence is the target); `.ksv-fab`
(KL#76); status chips (not controls).

**`.drawer` declared `backdrop-filter: blur(28px)` on every device while its
background was fully opaque** - a blur behind an opaque background is painted
over and cannot be seen, so phones paid GPU cost during the slide transition for
nothing (KL#80). Disabled below 768px, which is exactly where R91's glass block
stops, so the two rules meet with no gap. `.drawer-overlay` keeps its blur - it
sits over content behind a 55% scrim, so that one **is** visible.

---

## 3. Repo layout

```
src/
  index.html          THEME_INIT_R92_2 pre-paint theme + R123 hints + R125 watchdog
  main.jsx            8 stylesheet imports + pwaUpdate side-effect (section 2)
  App.jsx             ~425 lines after the R117 split - SAFE to push whole
  components/         43 top-level files
    shell/            6 files - R117 split of App.jsx
    scan/             6 files - R110 split of AgroIntelScan
    weather/          11 files - R104/R106 split of Weather
  pages/              About, Contact, FAQ, Changelog, Privacy, Terms
  context/            SettingsContext.jsx (exports API)
  styles/             global, ds-tokens, ds-components, redesign1-5
  utils/helpers.js    safeGetLS / safeSetLS (RAW values), onActivateKey
  hooks/useFocusTrap.js  NAMED export. Escape-to-close + Tab cycling
  pwaUpdate.js        SW update polling - wired up in R99 (was dead 20 revisions)
admin-panel/          separate Vite app, OWN entry point - 40 pages
backend/              FastAPI
  main.py             middlewares, lifespan, metrics writer (R112), 2 endpoints
  dependencies.py     clients, auth, caches, ALLOWED_SETTINGS_KEYS, fallbacks
  routers/
    admin.py          ~1,050 lines - OVER the push limit, cannot be rewritten
    admin_data.py     R113 override router - MUST load before admin.py
    community.py      posts + GET /api/settings (the public settings feed)
    ai.py market.py auth.py superadmin.py ws.py
.github/workflows/e2e-tests.yml   misnamed - it is the whole CI pipeline
```

**The admin panel has its own entry point, so `redesign5.css` and every other
`src/styles/*` sheet does NOT apply there.** A fix shipped to the farmer app
never reaches admin.

**Over the push limit, cannot be edited as whole files:** `routers/admin.py`
(43 KB), `styles/redesign.css` (29.8 KB), `MandiPrices.jsx` (29.5 KB),
`Weather.jsx` (28.7 KB), `Community.jsx` (26 KB), `AIVoiceAssistant.jsx`
(26.5 KB), `AuthModal.jsx` (22.9 KB). **`App.jsx` is no longer on this list** -
R117 took it from ~900 to ~425 lines. That is the proven remedy: extract leaf
components first in their own push, wire the parent last. For `admin.py` a
different remedy was used (KL#62). **When a component is too big to edit, fix it
centrally from `redesign5.css` with `!important`** - that is what sections 11,
13 and 14 are.

**The three splits (the template for future ones):**

- **`components/shell/` (R117)** - `SplashScreen`, `MaintenanceScreen`,
  `AnnouncementModal`, `UpdatePrompt`, `InstallPrompt`, `SiteFooter`. Four
  pushes, parent last.
- **`components/scan/` (R110)** - `scanStore.js`, `ScanIcons.jsx`,
  `ScanHistory.jsx`, `ScanCamera.jsx`, `ScanResult.jsx`, `CropDoctorChat.jsx`.
  1,300 -> 370 lines.
- **`components/weather/` (R104/R106)** - `PinIcon`, `CitySearch`,
  `LocationGate`, `WeatherAlerts`, `HourlyRain`, `SoilMoisture`,
  `CropHealthIndex`, `SprayWindow`, `FuelPrices`, `panel.js`, `weatherMaps.js`.

**Section header pattern, used by all 19 features:**

```jsx
<div className="card mt3">
  <div className="card-hd"><span className="card-title">Title</span></div>
  <div className="card-body">...</div>
</div>
```

Feature sections carry stable ids `#sec-scan`, `#sec-weather` ... rendered by
`FeatureGrid` as `<div key={id} id={f.id}>` - it is the **sole owner** of those
ids. Icon chips hang off them via `::before`, scoped to `[id^="sec-"]`. **The
chip and the full `#sec-*` map are declared TWICE** - in `ds-components.css` AND
`redesign3.css`; grep both (KL#45). Those ids are load-bearing for navigation:
sidebar and home-hero tiles scroll by `getElementById` (KL#46).

### The boot path (R121-R125)

Four revisions treated "time to first useful paint on a cheap phone" as a
first-class concern. Read this before touching `index.html`, `App.jsx`'s mount
effects, or any `@import`.

- **R121** - `global.css` `@import`ed IBM Plex Sans, downloaded on every load and
  used by almost nothing, because `redesign.css` re-points `--sans` to Inter and
  loads later. `--sans` is now `system-ui` first.
- **R122** - the Google Translate widget was a **blocking** `<script>` on every
  load, including for the English majority. Now gated behind the `googtrans`
  cookie or `agrointel_lang` and injected `async`. Safe because
  `LangSwitcher.switchLang()` ends in `window.location.reload()`, so the
  preference is committed before the load that reads it, and nothing reads
  `window.google` synchronously (it polls `.goog-te-combo` from 1000ms).
- **R123** - `preconnect` + `dns-prefetch` for the Render backend, and fonts
  **hoisted out of a chained `@import`** inside `redesign.css` (KL#70).
- **R124** - the splash was gated on a `Promise.allSettled` over `/health`
  (whose only success effect is a `console.warn`) and `/api/news` (the
  decorative ticker), with `/api/news` fetched **twice** and no abort timeout, so
  the 8000ms ceiling was the normal release, not the worst case. **Reverted the
  same night, precautionarily - see below.**
- **R125** - `BOOT_WATCHDOG_R125` in `index.html`. After 12s, if `#root` has no
  children: if a service worker **controls** the page and this session has not
  tried yet, wipe Cache Storage, unregister workers, reload once; otherwise
  render a plain Retry screen. `#root` emptiness is the right signal *because*
  `SplashScreen` renders inside it, so a visible splash means React is alive.

**THE BLACK SCREEN OF 26 JUL 2026 - UNRESOLVED. Do not inherit a diagnosis.**

The owner reported a completely black screen shortly after two deploys went out
five minutes apart (R123 `index.html`, then R124 `App.jsx`). `App.jsx` was
reverted to its pre-R124 state (`2203deff`) and the site came back.

**That did NOT prove R124 caused it.** The revert was itself a new deploy, and a
new deploy also replaces the precache, so both candidate causes predict "fixed
after deploying". Both changed files were read **in full** before the revert and
neither showed a mechanism: every render path returned something, `index.html`
kept `#root` and its module script, and neither push was truncated.

**The likelier cause remains the service worker** (KL#74): black with *no* error
text means React never executed, because a mounted-then-thrown React would have
shown `ErrorBoundary`'s fallback. R125 exists so a recurrence self-heals and
*reports* itself instead of being a silent black rectangle.

**When re-landing R124: one deploy, not two in quick succession, with a
confirmed-good load in between.** The pre-R124 boot cost is back in the
meantime - an 8s cold-start splash and a doubled `/api/news` request. A slow app
beats a black one.

**Font request map (post-R123)** - fonts are a boot-path problem, not a styling
one:

- `index.html` `<link>` - Inter 400-800, Space Grotesk 500;600;700, IBM Plex
  Mono 500;700, Playfair 700;900.
- `global.css` `@import` - Plex Mono 500;600 + Playfair 700;900.
- `redesign.css` `@import` - Inter + Space Grotesk. **Redundant after R123 but
  deliberately left**: the file is 29.8 KB, over the push ceiling, and rewriting
  it is the trade that broke the site in R95. Identical `woff2` URLs dedupe, so
  redundant is not harmful.
- `admin-panel/` has its own `index.html` and font set entirely.

---

## 4. The settings pipeline (admin panel -> website)

Traced end to end and repaired in R113/R116. This is the path behind the owner's
most-repeated complaint, *"features I disabled still show on the site"*.

```
admin form
  -> PATCH /api/admin/settings      admin_data.py (R113) - service role, VERIFIED
  -> settings table, single row id=1
  -> GET  /api/settings             community.py  (R116) - select(*), no cache
  -> SettingsContext                60s poll + refetch on focus/visibility
  -> FeatureGrid / HomeHero / SidebarDrawer
```

**Both ends were silently broken and neither raised an error.**

- **Write (R113):** saves used the **anon** client. An RLS-blocked UPDATE is not
  an error - it changes zero rows and returns **HTTP 200**, so the panel showed
  "Saved!" while nothing changed (KL#18). Now uses `supabase_admin` and
  **verifies `r.data` is non-empty**.
- **Read (R116):** on any exception `get_public_settings` returned **200** with a
  five-key fragment containing **no `disabled_features`**. `FeatureGrid` shows
  every feature not in that list, so one failed poll re-enabled every disabled
  feature and `SettingsContext` cached the fragment over the good copy. Now a
  genuine failure returns **503** so the client keeps its cache; only an
  unconfigured database returns defaults, and those defaults are **complete**
  (KL#59).

**Verified healthy, do not re-investigate:** the endpoint does `select("*")` and
strips only `blocked_ips` and `id`; there is no server-side settings cache;
`vite.config.js` excludes `/api/settings` from service-worker caching
(`SETTINGS_SW_R89`); `SettingsContext` hydrates **synchronously** from
`agrointel_settings_cache`, normalises `ARRAY_KEYS`, and never overwrites good
settings with `{}` (`SETTINGS_RESILIENCE_R89`).

**`SettingsContext.loaded` is NOT a readiness signal for UI** (KL#71). Settings
hydrate synchronously from cache in `useState`, but `loaded` only flips in
`loadSettings()`'s `finally` - and with `FETCH_TIMEOUT_MS 25000` plus one retry
after `RETRY_DELAY_MS 3000`, that can be **~53 seconds** against a sleeping
Render backend. Gating a splash on it would have been far worse than the bug it
was meant to fix.

**`ALLOWED_SETTINGS_KEYS` lives in `dependencies.py`** and gates every save. A
key absent from it is silently dropped, and if it was the only key the request
400s - exactly how the Error Rate page's threshold control failed 100% of the
time while looking real (KL#57).

**`setup_database.sql` HAS been run by the owner** (26 Jul). The write policies,
`api_metrics` DDL and the other tables now exist. The `RECOMMENDED HARDENING`
block at the bottom is **not** run - do not run it blindly.

---

## 5. Hard-won lessons (KL)

### Stylesheet removal and tokens

- **KL#34 (R97, the expensive one) - unloading a stylesheet orphans its
  SELECTORS, not just its variables.** Components styled only there render bare.
  Build stays green. Follow the migration procedure.
- **KL#31 - it orphans custom properties too.** Always write
  `var(--x, fallback)`; `AuthModal` survived R95 only because it did. And
  **verify a token is actually missing before "restoring" it** (old KL#44) - a
  fix for a non-existent bug was one step from shipping.
- **KL#32 - components inject their own `<style>` at mount**, landing after
  imported CSS, so they win at equal specificity - hence `!important` in
  `ds-components.css`. **Exactly four do it:** `SidebarDrawer`, `ProfileModal`,
  `AuthModal`, `AIVoiceAssistant` (plus `SplashScreen`, no controls). All read.
- **KL#78 (R127) - a later sheet can silently re-declare tokens a token layer
  deliberately re-pointed**, resurrecting an abandoned design language and
  splitting one scale into two. **And a stylesheet header comment can describe a
  load order that was later reverted** - `ds-tokens.css` still claims the
  `redesign*.css` files are unloaded. Verify against `main.jsx`.
- **KL#66 - a font removed from the design language can keep downloading.**
  Deleting a `font-family` does not delete the `@import` that fetches it.
- **KL#67 - re-pointing a token does not move hardcoded call sites.**
  `redesign.css` re-points `--serif`, yet `FertCalc`, `GovtSchemes` and
  `AgroIntelScan` still hardcode `fontFamily: "Playfair Display"`. Grep for the
  literal, not just the token.
- **KL#70 - a chained `@import` serialises a font behind that file's download
  and parse.** Hoist font links into `index.html`; the duplicate CSS request
  hits cache.

### CSS / markup

- **KL#36 - a class name is not a contract; read the rule before reusing it.**
  `.modal` sounds like a box and is a fullscreen overlay. A partial override does
  **not** neutralise a wrong base class.
- **KL#37 - `overflow:hidden` DELETES anything positioned outside the box.**
  `AccessCodeModal` put its close button at `top:-10px`; the dialog had **no
  visible way to close**.
- **KL#42 - `overflow:hidden` with no `max-height` inside a fixed overlay makes
  content UNREACHABLE, not merely clipped.** Any dialog whose height grows with
  data needs an explicit scroll container.
- **KL#43 - a missing CSS *class* is invisible in review**, because the element
  still renders with base styling. `.chip.cx` was undefined while
  `AgroIntelScan` asked for it eleven times. **Define the variant centrally.**
- **KL#47 (R108.1, cost a deploy) - `border-width` + `border-style` with no
  `border-color` inherits `currentColor`.** A shared rule including `.btn` gave
  `.btn-g` - white text on green - a white outline. Set all three, or exclude
  elements whose text colour is not their border colour.
- **KL#63 - an `!important` shorthand resets every longhand it covers.** A
  blanket `padding:0!important` wipes the `padding-left` a marquee depends on.
- **KL#45 - the same rule or token family can live in TWO stylesheets** -
  `.ticker-content` is defined in **five**. Grep every sheet, and **audit the
  whole layer, not one selector** (old KL#26).
- **KL#40 - a `::before` default on a bare class hits every instance.** Scope
  generated content to the container that gives it meaning.
- **KL#41 - `animation:none` can BLANK an element rather than freeze it.** The
  ticker parked text off-screen with `padding-left:100%`; stopping the animation
  left the headline one viewport to the right. Reset the offset in the same rule.
- **KL#76 (R126) - an `!important` declaration outranks an ANIMATED value, so
  overriding an animated property KILLS the animation.** `.ksv-fab`'s pulse
  animates `box-shadow`; flattening that shadow from a sheet would have silently
  removed the pulse. Same family as KL#41. Caught before writing.
- **KL#79 (R129) - a `min-height` cannot lift an element that has been given an
  explicit `height`.** `global.css` has a coarse-pointer 44px block; it never
  raised `.modal-close`, because `redesign5.css` section 4 sets `height:34px`.
  **A safety net can look present and do nothing.** Check what the net actually
  sets against what the target actually declares.
- **KL#80 (R128) - `backdrop-filter` behind a fully OPAQUE background is
  invisible and still costs GPU work.** `.drawer` blurred on every device for no
  visible effect, during a transform transition, on low-end Android. When a
  design decision restricts an effect to desktop, **check the components that
  style themselves** - the sheets got the memo and the `<style>` blocks did not.
- **KL#64 - a CSS comment can describe an intent that was never carried out.**
  `redesign4.css` item 7 said a gapless ticker "needs the list rendered twice";
  the second copy was not added until R120, twenty revisions later. **Fix the
  markup too, or say plainly that it is blocked.**
- **KL#29 - `!important` beats a non-important inline style.**
- **KL#30 - later wins at equal importance, across media queries too.**
- **KL#12 - never put `*` immediately before `/` in a CSS comment.** Broke the
  build twice.
- **KL#9/KL#14 - `\uXXXX` renders LITERALLY in JSX text nodes** and in attribute
  string literals, but is **required** in CSS `content:`. In JSX a
  `{"\uD83D\uDCFA"}` *expression* works. In **Python** the escape decodes
  normally, so it is the safe way to keep a payload ASCII-only.
- **KL#75 (R126) - a media-query touch floor written against `.btn` and the
  input classes silently misses every component that styles bespoke class names
  in its own injected `<style>`.** Bound the blast radius with a search for
  `"<style>"` before assuming it is one component. Now closed (section 2).

### React / boot

- **KL#38 - one `<Suspense>` around N lazy components is one loading unit.**
  Correct nesting: **ErrorBoundary > Suspense > component, per feature.**
- **KL#46 - a control that scrolls to a conditionally-rendered id becomes a
  SILENT dead button.** When a feature is disabled `FeatureGrid` renders `null`,
  so `scrollIntoView` finds nothing and returns without error. **Anything
  navigating by `getElementById` must derive its list from the same source of
  truth that decides whether the target renders.**
- **KL#71 - a provider's `loaded` flag can lag ~53s behind its own synchronous
  cache hydrate.** Read the provider before gating any UI on its flag.
- **KL#74 - two deploys minutes apart plus PWA `skipWaiting` can strand clients
  on a cached `index.html` referencing purged asset hashes.** Every module 404s,
  `#root` stays empty, and `ErrorBoundary` never mounts - so there is **no error
  UI at all**, which is the tell. Reloading does not help because the same worker
  serves the reload. **Suspect this before your diff.** A failed Cloudflare build
  cannot cause it (the last good deploy keeps serving). Test in a private
  window: loads there but not in the normal tab means the code is fine and the
  cache is at fault.
- **A blank screen with an error box is a different bug from a blank screen with
  nothing.** The first is React running; the second is React never starting.

### Dashboards, data and honesty

- **KL#56 - a reader can be perfectly correct and still show nothing, because
  NOTHING WRITES the table.** `api_metrics_middleware` only called
  `logger.info`; five endpoints read that table. I reported "real data" from
  reading the readers. **Trace the writer.** Fixed in R112.
- **KL#57 - frontend and backend field names drift silently, and
  `undefined || 0` renders as a reassuring zero.** `AiUsage.jsx` read
  `today_scans`/`total_scans`/`daily` while the endpoint sent
  `total_tokens`/`total_calls`/`daily_usage` - **zero overlap**. A broken
  dashboard is indistinguishable from a quiet day.
- **KL#58 - a truthy sentinel string defeats a ternary badge.** `last_run`
  defaults to the **string** `"Never"`, so the badge read ACTIVE on a server
  where the scheduler had never run.
- **KL#59 - failing open to a PARTIAL object is worse than failing open to
  `{}`.** A five-key fragment with HTTP 200 *looks* like real configuration. **On
  a read failure return a non-2xx so the client keeps its cache.**
- **KL#60 - `.limit(N)` silently caps a "Total".** "Total Visits" froze at
  exactly 2,000 forever.
- **KL#61 - verify substring logic character by character before reporting it.**
  I nearly wrote up `"ai" in ep` as matching `/api/...`; it does not - in
  `"/api"` the `a` is followed by `p`.
- **KL#77 - an inherited issue list can contain FICTION; verify both sides of a
  contract before "fixing" it.** Issue 26 claimed a cache TTL was written but
  never read - both halves existed. Issue 19 claimed a broken greeting - the
  function was correct. **At least one fictional issue was authored inside this
  very file.** Closing something as never-broken is a real result; inventing a
  fix for correct code is a regression waiting to happen.
- **KL#17/KL#18 - never let a settings fetch fail open**, and an RLS-enabled
  table with no UPDATE policy returns **200 with zero rows changed**. **Verify
  `r.data` after a write.**
- **Guard every settings array with `Array.isArray` before `.includes`.**
  Throwing inside render takes the whole page down.
- **Validate admin-supplied ids before embedding them.** `settings.youtube_id`
  reaches an `<iframe src>` directly.
- **KL#6 - Marathi TTS must request `hi-IN`,** never `mr-IN`; never call
  `synth.cancel()` inside `speak()`. **The bug existed in two files**, both also
  reading a localStorage key nothing writes. Grep for the key, not the symptom.
- **Never show a number you cannot source.** R111 deleted a hardcoded model
  name, a hardcoded quota and two invented token estimates rather than
  substituting better constants.

### AI / backend

- **KL#48 - a REASONING model silently spends `max_tokens` on thinking.** A low
  cap truncates JSON mid-object, surfacing as "invalid response", not a limit
  error. **Always log `finish_reason`** - `"length"` deserves its own message.
  Send `reasoning_effort:"none"` only to models that support it, gated on model
  id, or the request 400s.
- **KL#49 - provider limits differ by transport.** Groq accepts images up to
  **20 MB by URL but only 4 MB as base64**, and base64 inflates ~33%.
- **KL#50 - an `except ImportError: return raw` fallback can silently violate an
  upstream limit.** Guard the limit at the boundary, not only the happy path.
- **KL#51 - a single hardcoded model id is a single point of failure.** A chain
  that advances on **429 and 400/404** while retrying transient 5xx converts
  both quota exhaustion and decommissioning into graceful degradation. A
  streaming fallback must yield **nothing** until it has a 200.
- **KL#13 - check the tier AND the deprecations page BEFORE shipping a model
  id.** "Newer" is not "supported", and **higher rate limits often live on the
  SMALLER model.**
- **Per-request DB writes on a free tier need a buffer, not removal.** R112's
  shape: append in memory, cap the buffer, flush one batch per minute, purge on
  a retention window, **self-disable after one failure** if the table is absent.

### Tooling

- **KL#15 - truncation.** A single `push_files` silently truncates around
  **720-760 lines**; it has cut a file mid-rule. All `content` strings must use
  `\n` escapes - literal newlines inside a CSS `content:` string broke two
  pushes.
- **KL#73 - the ceiling constrains what you WRITE, not just what you read.**
  This file is at it. Rewriting it means trimming settled history in the same
  pass; compress old revision-log rows and merge lessons that share a cause.
- **KL#52 - `get_commit` stats are the cheap truncation check.** Large deletions
  with few additions means truncation - **unless** you meant to shrink the file,
  in which case that ratio is exactly right (R117 was 51+/522-).
- **KL#68 - `get_commit` exposes NO patch text**, even with `include_diff:true`
  - only `stats` and per-file counts. Any claim about *which* lines changed is
  inference; say so.
- **KL#62 (R113) - when a file is too large to push, put the replacement in
  FRONT of it.** `admin_data.py` re-implements four endpoints and is registered
  **before** `admin.router`; FastAPI matches in registration order. **The trap:
  moving that `include_router` line below `admin.router` silently restores the
  old buggy behaviour**, and editing the originals appears to do nothing.
- **KL#65 - order a multi-push change so the intermediate state is degraded, not
  broken.** Leaves first, parent last.
- **KL#28 - a green build proves nothing about CSS or runtime.**
- **KL#39 - a file can exist, be correct, and be wired to nothing.**
  `pwaUpdate.js` never ran for ~20 revisions; `redesign5.css` sat inert for six.
  **Grep for the filename, not just its exports.**
- **KL#33 - GitHub code search lags HEAD.** Zero results is NOT evidence. It
  also returns only a few `text_matches` per file - enough to enumerate which
  files match, not to read them.
- `push_files` is whole-file, atomic, multi-file, needs no sha, **overwrites
  silently**, and **cannot delete files** - a mistake can only be tombstoned,
  then removed by the owner in the GitHub UI. It returns only a ref, so
  `get_commit` is mandatory. `files` must nest **inside** `toolArguments`.
- `search_code` rejects `language:JSX` (422); `OR` is unreliable. A **directory**
  path passed to `get_file_contents` returns a listing with `size` and `sha` -
  the cheap way to check a file against the push limit before reading it.
- `connections.github.*` is disabled; use `connections.mcpServer_github.runTool`.
  **Do not guess tool arguments - read `listTools` for the `inputSchema`.**

### Diagnosis / process

- **KL#25 - read the smallest component showing the pattern.** Never diagnose a
  visual complaint from a screenshot alone.
- **KL#35 - "crashed" from a non-technical report can mean "looks broken".**
  Establish which of blank screen / error box / unstyled / failed build it is
  *before* pushing a fix.
- **KL#72 - restore service first, diagnose second - and label the restore
  honestly.** The 26 Jul revert was **precautionary**, not a diagnosis, and
  saying so in the commit message is what stops a future session inheriting a
  false cause. **A fix that coincides with a deploy proves nothing when the
  deploy itself could be the cure.**
- **KL#53 - a review that reads only the diff cannot see a runtime symptom.** An
  external reviewer marked the vision change "no issues found" while the scan
  was live-broken.
- **KL#54 - fixing the failure you find first is not the same as fixing the
  failure the user reported.** R107 hardened against 503s; the symptom was
  truncated JSON. Reproduce the reported symptom before choosing what to repair.
- **KL#55 - deferring a blocked request for several turns reads as ignoring
  it.** Three scan-card asks sat undone for four turns on a genuine blocker that
  was never explained: *"i told you many things ... you ignored that"*. **Either
  say plainly that it is blocked and why, or unblock it first.**
- **Read the file before planning the fix.** R124 (a splash gated on `ctxLoaded`
  would have been ~53s), R121 (three files hardcode Playfair) and R127 (the
  hypothesis was wrong twice) were all corrected by reading, before any write.
- **The agent cannot see the rendered UI.** Every visual claim is an inference
  from the cascade. Ask for a screenshot or a named element rather than
  inventing a mechanism.
- **KL#24 - de-clutter passes compound.** Do not strip icons in the name of
  minimalism - the owner has objected to this specifically.
- After finding a bug, **grep for the same shape elsewhere.** A negative result
  is a real result, and better than manufacturing a fix. R128/R129 are the
  model: bound the set by search, read all of it, report the clean ones as
  clean.
- Always tell the owner to hard-refresh - the service worker serves stale CSS.
- **Verify the `files` array matches the commit message before pushing.** A
  message describing four fixes with three files has happened four times.

### Build / deps

- **KL#19 - lucide-react v1 exports NO brand/logo icons.** `Instagram`,
  `Twitter`, `Github` are a hard `MISSING_EXPORT` at bundle time and are
  **invisible in the dev server**. Broke the build once. The CI `guard` job greps
  for them.
- **KL#22 - prefer inline SVG** over any lucide export you cannot verify.
  `scan/ScanIcons.jsx`, `weather/PinIcon.jsx` and `shell/SiteFooter.jsx`'s
  `InstagramIcon` are the house pattern. `var()` is invalid in SVG presentation
  attributes - use `currentColor`.
- **KL#20 - never edit `package.json` deps via `push_files`** without
  regenerating the lockfile; `npm ci` hard-fails.
- **KL#23 - `window.location.href='/'` is never "back" in an SPA.** Use
  `navigate(-1)` guarded by `location.key !== "default"`.
- Confirm default-vs-named export before importing. `useFocusTrap` is **named**.

---

## 6. CI/CD

`.github/workflows/e2e-tests.yml` (misnamed; it is the whole pipeline):
`guard` -> `build-farmer-app` / `build-admin-panel` / `test-backend`.

The **`guard`** job greps `lucide-react` imports for brand names and exits 1 on a
match - it exists because of KL#19. `eslint.config.js` enforces the same via
`no-restricted-imports`. Node pinned to `20.19.0`. **`package.json` has no lint
script.** Cloudflare Pages builds **separately** from GitHub Actions - a green
Actions run says nothing about the Pages deploy.

**Deliberately not changed:** `@playwright/test` installed but no e2e run; lint
non-fatal; `wrangler.toml` still `name = "krishiai"`; `render.yaml` has no
`healthCheckPath`; `dependencies.py` has a `GITHUB_ACTIONS` bypass that makes
`import main` pass in CI - **do not touch it**.

**Owner action pending:** branch protection on `main` requiring `guard` and
`build-farmer-app`.

**CI blind spot, proven repeatedly:** nothing here detects an unstyled site, a
broken dialog, a module imported nowhere, an empty stylesheet, a white-on-white
button outline, a nav tile that scrolls nowhere, a decommissioned AI model id, an
endpoint that reads a table nothing writes, a frontend reading field names the
backend never sends, **a 26px tap target, a blur that costs frames and renders
nothing, or a blank page caused by a stale service worker**. All shipped green.
Items #49/#50 of the R104 list would close part of this: a Playwright
computed-style smoke test (which would also catch touch targets under 44px), and
a token-lint failing the build on raw hex literals. A contract test asserting
each admin endpoint returns the keys its page reads would close the rest.

---

## 7. AI / Groq configuration (verified 2026-07-26)

**Shipped:** `GROQ_MODEL=llama-3.3-70b-versatile`,
`GROQ_MODEL_FALLBACK=llama-3.1-8b-instant` (default),
`GROQ_VISION_MODEL=qwen/qwen3.6-27b`, `GROQ_MODEL2=VISION_MODEL`.

| Model | Status | Free RPD | Notes |
| --- | --- | --- | --- |
| `llama-3.3-70b-versatile` | **Free-tier SHUTDOWN 16 Aug 2026** | ~1,000 | The app's text model **by owner decision**. Groq names `openai/gpt-oss-120b` as replacement. |
| `llama-3.1-8b-instant` | Production, not deprecated | **~14,400** | The R109 fallback. 131k ctx, ~560 tps. |
| `qwen/qwen3.6-27b` | **Preview** tier | 1K RPM | **The ONLY image-capable model on Groq.** Also a **REASONING** model (KL#48). 16,384 max completion. |

**The 16 Aug 2026 date is absorbed, not solved.** When Groq drops the 70B model
the request will 400/404 and `TEXT_MODELS` falls through to the 8B model, so the
app degrades instead of dying. **Do not propose reverting the model** - this was
the owner's explicit decision after being shown the shutdown date and the ~93%
RPD reduction. Setting `GROQ_MODEL_FALLBACK` equal to `GROQ_MODEL` disables
fallback.

**Other verified facts:** `reasoning_effort` is supported ONLY by the gpt-oss
family, Qwen 3.6 27B and minimax-m2.7. `reasoning_format` and
`include_reasoning` are mutually exclusive, and `raw` + JSON mode is a 400.
Images: **URL <= 20 MB, base64 <= 4 MB** (KL#49). Flex Tier is paid only.
Deprecated: llama-4-maverick, Qwen3 32B, llama-guard-3-8b; `llama3-70b-8192` is
decommissioned and returns 400.

**`backend/routers/ai.py` (R109):** `_groq_headers()`, `_build_text_models()`,
`_text_completion()`, `_stream_text()` (walk `TEXT_MODELS`; retry same model on
transient 5xx, advance on 429 and 400/404), `_build_vision_models()`,
`_vision_completion()`, `_get_weather_context()`. Endpoints: `POST /api/scan`,
`/api/crop-doctor`, `/api/chat` (last two optionally SSE). Payloads omit
`"model"` - the helpers set it per candidate.

**AI usage accounting** is `record_ai_usage()` writing the in-memory `_ai_usage`
dict in `dependencies.py`. It resets on every restart, so the AI Usage page
reports "since last restart" and says so. `total_cost` uses a flat
0.0000002/token matching no published Groq price - **still wrong, and the reason
cost is not displayed** (issue 23).

---

## 8. Known outstanding issues

| # | Issue | Nature |
| --- | --- | --- |
| 1 | **Video Guides card serves an unrelated music video.** A DATA problem: `settings.youtube_id` in Supabase holds the wrong id. **Only the owner can fix this, in the admin panel.** The component validates id *format*, which cannot detect a well-formed id pointing at the wrong video. | content/config |
| 2 | Design-system migration incomplete - 8 stylesheets load. Follow section 2. | debt |
| 9 | **Unread / unaudited:** `KrishiMarket` (15 KB), `Community` (26 KB), `MandiPrices` (29.5 KB), and **34 of 40 admin pages**. Largest unread admin: `AdvancedSettings` (21 KB), `ManageAdmins` (14 KB), `AccessCodes`, `BugReports`, `TractorRentalsAdmin`, `FeatureToggles`, `Scans`. **`Weather`, `AIVoiceAssistant`, `SidebarDrawer`, `AuthModal`, `ProfileModal`, `redesign2.css` and `ds-tokens.css` have now been read in full.** | debt |
| 10 | **`AuthModal.jsx` hand-rolls its own focus trap** instead of using `hooks/useFocusTrap.js`, and its box (a `.card`) has **no `role="dialog"`/`aria-modal`** - confirmed by reading it in R129. Conversely `AIVoiceAssistant` **has** `role="dialog" aria-modal="true"` but **no focus trap or Escape handler**. Both want their own push; `AuthModal` is 22.9 KB, over the ceiling. | a11y |
| 12 | **Fonts: advanced, not closed.** R121/R123 took IBM Plex Sans off the critical path and hoisted the rest out of a chained `@import`. **Remaining blocker:** `FertCalc`, `GovtSchemes` and `AgroIntelScan` hardcode `"Playfair Display"` (KL#67), so the Playfair fetch cannot be dropped until they move to `var(--serif, Georgia, serif)`. **Needs an owner decision** between Space Grotesk (headings) and Playfair (big numbers) - they currently disagree, which is itself a reported inconsistency. Inter is still fetched twice; the `redesign.css` `@import` cannot go until that 29.8 KB file is split. | perf |
| 16 | **Fake / hardcoded data - what REMAINS.** `get_fallback_mandi()` returns **21 hardcoded Pune APMC rows** labelled `"status":"fallback"` - the frontend should surface that label. `api_metrics` has **no `ip_address` column**, so the admin "top IPs" table cannot be populated without a DDL change. | honesty |
| 17 | **`ai.py::_get_weather_context` still defaults to Pune 18.5204/73.8567** for the voice assistant, though the frontend default was removed in R104. Needs the client to send coordinates - a frontend change too. | correctness |
| 20 | Remaining R104 audit items: fuel panel placement (#43), and a real `.panel` class. (#4 contrast-mode surfaces closed by R127; #26 closed as fiction.) | minor |
| 21 | **Four dead endpoint definitions in `admin.py`** - `PATCH /api/admin/settings`, `error-stats`, `feature-usage`, `rate-limits` are shadowed by `admin_data.py` (KL#62). Unreachable, and editing them appears to do nothing. Delete when `admin.py` is split. | debt |
| 22 | **In-memory state resets on every Render sleep** - `_task_last_run`, `_ai_usage`, rate-limit windows, the metrics buffer. Pages now say so; the real fix is persistence. | correctness |
| 23 | **`total_cost` on `/api/admin/ai-usage` uses a flat 0.0000002/token** matching no Groq price. Cost is withheld from the UI until the per-model rate is right. | honesty |
| 24 | **The 26 Jul black screen has no confirmed cause** (section 3). R125 makes a recurrence self-healing and self-reporting; it is a safety net, not a fix. **R124 is reverted and can be re-landed as a single spaced deploy.** | unresolved |
| 25 | **Inert selectors to drop** when their sheets are next edited for a real reason: `.header-right .badge-live` (`redesign2.css`); `.badge-live`/`.live-dot` and `#google_translate_element_mobile` (`global.css`) - the last matches nothing at all. | dead code |
| 27 | **Desktop liquid glass is half-applied** - R91 covers `.card`, `.modal-content`, `.header`, `.drawer`, `.home-hero` only, so above 769px translucent cards sit beside opaque `.ksv-card` and shell prompts. **Needs an owner decision:** extend it, or remove it for one material everywhere. ~5% of users. | consistency |
| 28 | **`AIVoiceAssistant` is still claymorphic inside** - gradient buttons, an inset-shadowed orb, a gradient-clipped title, and `.ksv-fab`'s animated double shadow (KL#76). R126 fixed only the card. **Blocked on splitting the 26.5 KB file.** | consistency |

**Closed this session:** issue 15 (`App.jsx` split, R117); issue 6 (ticker gap,
R120); issue 11 (dead Live pill, R119 - owner chose deletion); issue 18 (footer
alignment + inline-SVG icons, R118); **issue 8 (`.ksv-card` clay shadow, R126)**;
**R104 item #4 (contrast-mode surfaces, R127)**. Earlier: issues 3, 4, 5, 7, 13,
14, and both halves of the settings pipeline (R113, R116).

**Closed as never-broken - do NOT "fix" these** (KL#77): **issue 19** (greeting;
`HomeHero.greetingFor()` was already correct) and **R104 item #26** (this file
claimed `ks_weather_summary`'s TTL was written but never read - **both halves
exist**: `WEATHER_CACHE_R98` writes `{summary, ts}` and `AIVoiceAssistant.jsx`
checks `Date.now() - _wCache.ts < 1800000`).

**Backend (open, low priority):** `_maint_cache` namespace collision;
`settings_history` snapshots the whole row on every save; `export_csv` error text
says "users" not `app_users`; `community.py` does no server-side array
normalisation and `/sold` + `/edit` trust a client-supplied `author`; bare
`except:` clauses; `CORS_ORIGINS` unused because the code hardcodes
`allow_origins=["*"]`; `purge_visitors` deletes on `created_at` while the stats
read the `time` column. Consider reporting Groq's `x-ratelimit-*` headers so the
admin panel can show real remaining quota. **Never push `admin.py` as a whole
file** (KL#62).

---

## 9. Revision log

| Rev | Commit | Summary |
| --- | --- | --- |
| R81-R94 | - | flat editorial -> token unify -> vibrancy -> premium dual-theme -> news ticker -> CI guard -> BackButton/FOUC/contrast -> de-terminal -> typography (mono demoted to digits) |
| R95-R97 | `70f20324` .. `1339b2cf` | **the expensive one.** 4 `redesign*.css` imports removed on a wrong assumption; site rendered bare with a green build; R97 restored all four (KL#34) |
| R98-R103 | `0a307aa1` .. `85c0254b` | modal contract fixed (KL#36); pwaUpdate wired after ~20 dead revisions (KL#39); per-feature Suspense (KL#38); first end-to-end read of the four legacy sheets (KL#40, KL#41) and of `AgroIntelScan` (KL#42, KL#43); `HomeHero` tiles ignored `disabled_features` (KL#46) |
| R104-R110 | `a8c7f5d6` .. `e1f761dd` | ~38 of 50 audited UI items; **`Weather` and `AgroIntelScan` split**; Pune default replaced by `LocationGate` + `CitySearch`; unverified model ids shipped and withdrawn (KL#13); `redesign5.css` filled and wired; white outline on green buttons (KL#47); **scan fixed** - reasoning gated by model id, `finish_reason` surfaced (KL#48), base64 guard (KL#49), fallback chain (KL#51); Hindi/Marathi TTS (KL#6, KL#55) |
| R111-R116 | `8d4f345a` .. `0f3b11d9` | **the analytics/honesty pass.** `AiUsage` read fields the API never sent (KL#57); `api_metrics` had no writer at all (KL#56); `admin_data.py` registered ahead of the unpushable `admin.py` (KL#62); settings writes verified (KL#18); threshold control was decoration; "Total Visits" capped at 2,000 (KL#60); Task badge always ACTIVE (KL#58); `/api/settings` failed open to a partial object (KL#59) |
| R117-R120 | `148d6b24` .. `df79d496` | **`App.jsx` split ~900 -> ~425 lines** into `components/shell/`, four pushes, parent last (KL#65) - unblocked four owner requests. Footer alignment, `redesign5.css` §9 (KL#45). Dead Live pill removed - **asked the owner instead of guessing**. Ticker gap closed with §10 after adding the second segment the CSS comment had wanted since R94 (KL#64) |
| R121-R123 | `ad4de859` `7637669b` `08384741` | boot path: IBM Plex Sans off the cold path (a `search_code` overturned the plan mid-revision - KL#66/#67); Google Translate no longer blocks every load (KL#69); backend `preconnect` + fonts hoisted out of a chained `@import` (KL#70). Also disclosed a JSON-LD key order disturbed in R122 |
| R124 | `47381ba4` | Splash no longer waits on a `console.warn` and the decorative ticker; `/api/news` was fetched twice with no timeout. **REVERTED the same night (`2203deff`)** after the black-screen report - precautionary, not a diagnosis (KL#72) |
| R125 | `02155b80` | **`BOOT_WATCHDOG_R125`** - after 12s with an empty `#root`, wipe caches and reload once if a service worker is in control, else show a Retry screen. Turns an unrecoverable black screen into a self-healing, self-reporting event (KL#74) |
| R126 | `e3354fc6` | `redesign5.css` **§11 `VOICE_CARD_R126`** - `.ksv-card`'s clay double shadow flattened (issue 8) and `.ksv-close`/`.ksv-lang`/`.ksv-chip` raised to the mobile floor. **Exposed KL#75**: the 44px floor only ever selected `.btn` and the input classes. `.ksv-fab` left alone - KL#76 caught before writing |
| R127 | `863708a5` | **§12 `SURFACE_TOKENS_R127`** - the owner's "claymorphism conflicts". `redesign2.css` was overriding `ds-tokens.css`'s deliberate re-pointing of `--clay-*`, so dark mode ran **two surface scales**; contrast mode drew off-black panels on black. **The hypothesis was wrong twice and reading fixed it** (KL#78) |
| R128 | `f067dcc7` | **§13 `DRAWER_MOBILE_R128`** - `search_code` bounded the `<style>`-injector set to four. `.drawer-close` 40->44px, and `.drawer`'s **invisible** `backdrop-filter` disabled below 768px where its background is opaque (KL#80). Nav links were already 52px - reported as fine, not padded |
| R129 | `d9a572de` | **§14 `TOUCH_TARGETS_R129`** - sweep CLOSED. `.auth-link` (~26px: "Forgot password?", "Resend OTP", every "Back") raised to 44px, and `.modal-close` fixed app-wide. **KL#79**: `global.css`'s coarse-pointer 44px net never worked because it sets `min-height` against an explicit `height`. `ProfileModal` reported clean |

---

## 10. Conventions

- Push directly to `main`, no PRs. **Verify every push** (KL#15, KL#52, KL#68).
- **Space production deploys.** Two pushes minutes apart is what made the 26 Jul
  incident permanently ambiguous. Confirm a good load between deploys, and never
  ship two boot-path changes back to back (KL#74).
- **Smartphone first - 95% of users.** Boot round trips, font bytes, 44px touch
  targets, GPU cost and offline recovery outrank desktop polish.
- Never remove a stylesheet import without the section 2 procedure (KL#34).
- **New global CSS goes in `redesign5.css`** (loads last). Theming to
  `ds-components.css`, tokens to `ds-tokens.css`, layout to `global.css`.
- When you add a decorative rule, **delete the one it replaces in the same
  commit** - every R100 defect was an add with no matching remove. **And check
  whether the markup the comment assumed was ever written** (KL#64).
- Dialogs: `.modal-overlay` > `.modal-content` (or `> .card`). Never `.modal` as
  the box (KL#36). Close control inside the paint area (KL#37); data-driven
  dialogs need a scroll container (KL#42).
- Lazy components: `ErrorBoundary > Suspense > component`, per item (KL#38).
- **Anything that navigates to a feature must read `disabled_features`** (KL#46).
- **Disabled features must vanish everywhere** - sidebar, welcome banner, hero
  tiles. The owner has raised this more than once.
- **Every control must clear 44px below 600px.** The floor in section 6 does not
  reach bespoke class names in component-injected `<style>` blocks - add those
  explicitly (KL#75, and sections 11/13/14 for the four known cases). Status
  chips and `htmlFor`-bound checkboxes are legitimate exceptions.
- To edit a file over the push limit, **split it**: leaf components in their own
  push first, parent wired last (R110, R117). For a backend router, register a
  replacement ahead of it (KL#62). Prefer a central CSS fix over editing 19
  components; prefer one small component over a blanket `!important`.
- **Before trusting a dashboard, find the writer** (KL#56), and check the
  endpoint's response keys match what the page reads (KL#57).
- **A read failure must not look like data.** Return a non-2xx and let the
  client keep its cache (KL#59). **Verify a write changed rows** (KL#18).
- **Never print vendor/model names or unsourced constants in UI.**
- UI must work in **English, Hindi and Marathi**. Never uppercase or monospace
  Devanagari. A last-resort recovery screen may be English-only, but say so.
- **Confirm an inherited issue against the source before fixing it** (KL#77).
  Several documented issues were fiction, and one was authored here. Closing
  something as never-broken is a real result. **Do not invent a fix for code
  that is already correct.**
- Own mistakes plainly, and **never claim a visual or AI fix is verified** - ask
  the owner to hard-refresh and report. **When a restore coincides with a
  deploy, say the cause is still unknown** (KL#72).
- **Keep this file current every session**, and trim as you write (KL#73).

**LocalStorage keys:** `agrointel_user`, `agrointel_username`,
`agrointel_liked_posts`, `agrointel_notifications`, `agrointel_theme` (default
`"auto"`, RAW), `agrointel_onboarded`, `agrointel_ann_last`,
`agrointel_bulk_msg_seen`, `agrointel_token`, `agrointel_install_dismissed`,
`agrointel_premium`, `agrointel_settings_cache`, **`agrointel_lang`**,
**`agrointel_boot_recovery`** (session, R125), `krishi_scan_lang`,
`krishi_scan_history`, `ks_weather_summary` (`{summary, ts}` - **TTL written AND
checked at 30 min; the old "never checked" note here was wrong**),
`ks_microclimate_reports` (max 20). Admin panel:
`agrointel_admin_error_threshold`. Cookie: **`googtrans=/en/{hi|mr}`** - the
actual language switch. **`agrointel-lang` is read by nothing.**
