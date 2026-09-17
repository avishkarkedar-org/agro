# AgroIntel - Cold-Start Reference

**Companion to `CONTEXT.md`. Read `CONTEXT.md` FIRST** - it holds the
architecture, the modal contract and the hard-won lessons. This file holds the
lookup data that is expensive to rediscover: inventories, blob SHAs, tool
quirks, and how the owner wants to be worked with.

**Last updated:** 2026-07-25, after R98.1.

---

## 1. How to work on this project (standing instructions)

These are the owner's persistent expectations, not one-off requests.

- **Push directly to `main`.** No PRs, no branches. Every push is production.
- **Never break the build.** If it breaks, fix it immediately in the same
  session. Cloudflare/Render/GitHub Actions must all stay green.
- **Update `CONTEXT.md` every session.** Non-negotiable. It was once allowed to
  fall ~9 revisions behind and actively described an architecture that no longer
  existed, which is worse than having no document.
- **Audit thoroughly, line by line.** Read whole files before changing them.
  "Read the smallest component exhibiting the problem" beats guessing from a
  screenshot.
- **Work sequentially and self-audit.** After each change, ask what else it
  could affect and check for cascade conflicts before moving on. The owner's
  words: *"think in every aspect use logic what will happen if ? Ask yourself. I
  want perfect."*
- **Grep for the same bug shape elsewhere** before declaring a fix done. This
  doubled the value of R98.
- **When told "do it acc to you"**, commit to a stated design thesis and
  execute. Do not hand the decision back.
- **Own mistakes plainly.** Several regressions here were self-inflicted; say so
  directly rather than describing them neutrally.
- **Do not claim a visual fix is verified.** There is no browser access and no
  CI log access. Ask the owner to hard-refresh (`Ctrl+Shift+R`) and confirm, and
  ask them to paste build output.
- Owner is non-technical about frontend internals. "Crashed" may mean "looks
  broken". Clarify before acting (KL#35).
- Language: UI must work in English, Hindi and Marathi. Marathi **voice** was a
  past fix area. Never apply `text-transform: uppercase` or monospace to
  Devanagari.

---

## 2. Tool cookbook (GitHub MCP)

`connections.github.*` is **disabled**. Use:

```
connections.mcpServer_github.runTool({ toolName, toolArguments })
```

| Tool | Arguments | Notes |
| --- | --- | --- |
| `get_file_contents` | `{owner, repo, path, ref}` | The reliable read. Use to verify every push. |
| `push_files` | `{owner, repo, branch, files:[{path,content}], message}` | Whole-file, atomic, multi-file, **no sha needed**, **CANNOT delete files**. |
| `search_code` | `{query: "... repo:owner/name"}` | Index **lags** behind HEAD. |
| `list_commits` | `{owner, repo}` | |

**Hard limits and quirks:**

- **~720-760 lines per single-file push**, then it silently truncates. It once
  cut a file mid-rule. **Always re-fetch after pushing** (KL#15). Split large
  files across separate pushes; never bundle two big files in one call.
- `search_code` rejects `language:JSX` -> `422 ERROR_TYPE_QUERY_PARSING_FATAL`.
- `search_code` `OR` operators are unreliable. Quoted fragments work well, e.g.
  `"className=\"modal" repo:avishkarkedar-org/AgroIntel` - that is how the
  second broken dialog was found.
- **No tool for Actions runs or CI logs.** The owner must paste build output.
- There is **no line-patch tool**. Every edit is a whole-file rewrite, so a file
  must be read in full first.
- Repo id `1234543397`. GitHub user `AvishkarKedar` (id 232793079).

---

## 3. Stylesheet inventory

Load order and rationale are in `CONTEXT.md` section 2. Blob SHAs as of R98.1:

| File | Blob | Role |
| --- | --- | --- |
| `src/styles/global.css` | `20471c48d64d055aa6cb5bde4a6eaeb7d934382d` | R96 structure-only |
| `src/styles/ds-tokens.css` | `90dfa4678dd52ae0fbcdf78c93e35617a6580d32` | tokens + legacy bridge |
| `src/styles/ds-components.css` | `b7287bf2fc3dfaf0725fc67c739448f7a409b694` | component layer |
| `src/styles/redesign.css` | `dbf6fe6c220c49914536ca510a28918eba4e7fd7` | legacy, load-bearing |
| `src/styles/redesign2.css` | `7a8f2497fd7a5476a21f11659209f3a0014f2435` | legacy, load-bearing |
| `src/styles/redesign3.css` | `2700e05107c3c80b512259707a2618bf825f94dd` | legacy, load-bearing |
| `src/styles/redesign4.css` | `baecb9606f5045bf31e117ac338a60cb1b01c170` | legacy, load-bearing |

**Pre-R96 `global.css` for reference:** `051c397d202bc91ad00e9a03cbf7624bebf31db8`
(had the clay/glass blocks and mono-first typography that were deleted).

### What each legacy sheet uniquely provides

This is the checklist for the migration procedure. **Verify against the files
themselves before removing anything** - this list is known-incomplete, which is
precisely what caused the R95 breakage.

- **`redesign.css`** - sole definer of `--border-soft`, `--line-strong`,
  `--shadow-sm`, `--r-sm: 12px`, `--r-md: 14px`. Light-theme
  `--clay-surface: #ffffff`, `--clay-surface-2: #f2f6f2`. R85 `--green: #34d399`.
  R86 ticker `padding-left: 1.5rem`. `.ksv-card`,
  `.btn* { border-radius: var(--r-sm) }`.
- **`redesign2.css`** - `--clay-bg: #030504`, `--clay-surface: #0a0d0b`,
  `--clay-surface-2: #0f1311`, `max-width: 1800px`,
  `.ks-social-row { font-size: 11px }`, **hero and footer icon rules**.
- **`redesign3.css`** - R91.1 + R91.2 + R92.2 + R93. Contains
  `.home-hero { background: var(--clay-surface) !important }`.
- **`redesign4.css`** - R94, nine blocks.

**Known orphan risk if these are unloaded** (`.home-hero` is CONFIRMED; the rest
are suspected and unverified): `OnboardingTutorial`, `OfflineBanner`,
`ScrollTopButton`, `FloatingLoginBtn`, `SeasonalBanner`, `.install-prompt`,
`.mandi-row`, `.nav-btn`, `.ksv-*`.

### `ds-tokens.css` scale

Dark: `--ds-bg #0a0d0c`, `--ds-surface #121815`, `--ds-surface-2 #182019`,
`--ds-surface-3 #1e2823`, `--ds-line rgba(255,255,255,.08)`,
`--ds-line-2 rgba(255,255,255,.14)`, `--ds-text #eef2ef`, `--ds-text-2` .74,
`--ds-text-3` .56, `--ds-accent #34d399`, `--ds-accent-2 #10b981`,
`--ds-accent-soft rgba(52,211,153,.12)`, `--ds-accent-line rgba(52,211,153,.26)`,
`--ds-warn #fbbf24`, `--ds-danger #fb7185`, `--ds-info #60a5fa`.
Radii `--ds-r-sm 8px` / `--ds-r 14px` / `--ds-r-lg 18px` / `--ds-r-pill 999px`.
`--ds-sh-1/2/3`, `--ds-focus 0 0 0 3px rgba(52,211,153,.34)`,
`--ds-ease cubic-bezier(.22,1,.36,1)`.

`html.light`: `--ds-bg #eef2ee`, `--ds-surface #fff`, `--ds-surface-2 #f5f8f5`,
`--ds-surface-3 #eaf0ea`, `--ds-line rgba(13,27,20,.10)`, `--ds-text #0f1a14`,
`--ds-accent #0f8a4d`, `--ds-accent-2 #0b6f3e`, `--ds-warn #b45309`,
`--ds-danger #be123c`, `--ds-info #1d4ed8`.

`html.contrast`: black surfaces, `#fff` lines, `--ds-accent #4ade80`,
shadows `none`.

**Legacy bridge** (`:root, html.light`) re-points the names 43 components already
consume: `--bg --text --t2 --t3 --s1 --s2 --s3 --surface --surface-2 --b1 --b2
--line --line-strong --border-soft --green --g2 --g3 --gdim --amber --adim --red
--rdim --blue --bdim --purple --pdim`, `--r-sm --r-md --r-lg --radius`,
`--shadow-sm --shadow-md --shadow-lg --shadow-soft --ease-clay`, all `--clay-*`
(now flat), `--glass-blur: none --glass-fx: none` and friends, `--inner-fill*`.
**Re-point legacy names; never rename them** (KL#34-adjacent).

### `ds-components.css` coverage

`body` 16px/1.55; `.bg-glow::before/::after` disabled; `.card` surface + line +
`--ds-r-lg` + `--ds-sh-2`, `::after` accent gradient; hover only >=769px; nested
surfaces (`.post-card .res-card .fert-box .fday .day-detail .detail-box
.pest-item .advisory .lang-menu .quick-nav`) -> `--ds-surface-2`;
`.card:has(> .card-hd)` padding reclaim; `.card-title` sans 15px/700; `label`
sans 12.5px/600; mono restricted to `.clock .tx-num .fert-num .mono .big-temp`;
`.card-title::before` 28x28 icon chip + 18 `#sec-*` overrides
(`#sec-pest{display:none}` - it already had an emoji in its text);
`.btn-g/-o/-r`; `:focus-visible` -> `--ds-focus`; `.input` 16px (prevents iOS
zoom); `.chip` pill + `.cg/.ca/.cr/.cb`; `.filter-btn`; `.badge`; `.avatar .prog
.step-bar .skel .dropzone .upload-btn .slider`; `.header` opaque, no blur;
**`.drawer` de-glass override block** (all `!important`, needed per KL#32);
`.grid{columns:auto}`; `.main` 1560px + `padding-bottom: calc(96px +
env(safe-area-inset-bottom))`; modals `rgba(0,0,0,.62)` + 4px blur; `.toast`;
`.ticker-content{padding-left:100%}`; `.ks-footer*`; scrollbar; `::selection`;
`html.contrast` block last.

**Per-feature icon map:** `sec-scan \01F52C` · `sec-planner \01F4CB` ·
`sec-weather \026C5` · `sec-mandi \01F4B0` · `sec-fert \01F9EA` · `sec-pest`
suppressed · `sec-community \01F465` · `sec-market \01F6D2` ·
`sec-schemes \01F4DC` · `sec-yield \01F4CA` · `sec-encyclopedia \01F4D6` ·
`sec-video \01F4FA` · `sec-kvk \01F4DE` · `sec-rentals \01F69C` ·
`sec-soil \01F331` · `sec-calendar \01F4C5` · `sec-seasonal \01F33E` ·
`sec-ledger \01F4D2` · `sec-fert-tracker \01F4C8`; default `\01F331`.

---

## 4. Component inventory (`src/components/`, blob / bytes)

`AIVoiceAssistant.jsx` `6b668e80` 26,470 · `AccessCodeModal.jsx` `ad4497c4`
5,154 · `AgroIntelLedger.jsx` `c608dd5f` 5,173 · `AgroIntelScan.jsx` `1b40fc12`
45,892 · `AuthModal.jsx` `56f1ac3e` 22,893 · `BackButton.jsx` `238bef22` 2,958 ·
`Clock.jsx` `b547a794` 1,752 · `Community.jsx` `1b3923ef` 26,011 ·
`ConfRing.jsx` `c8ae1d2f` · `ConfirmHost.jsx` `13ae65fa` · `CropCalendar.jsx`
`58d5dc35` · `CropPlanner.jsx` `f2c33008` 14,246 · `DailyTip.jsx` `c245f028`
2,787 · `ErrorBoundary.jsx` `dea25fa4` · `ErrorBoundaryFallback.jsx` `e42d2d53`
· `FeatureGate.jsx` `9f093f26` · `FeatureGrid.jsx` `3d5f3369` 8,808 ·
`FertCalc.jsx` `b4f87962` 20,639 · `FertilizerTracker.jsx` `84300a62` ·
`FloatingLoginBtn.jsx` `cfc66151` · `GovtSchemes.jsx` `240d1153` 25,250 ·
`HomeHero.jsx` `77f34011` 2,917 · `KVKDirectory.jsx` `7a70bb7e` 3,333 ·
`KrishiMarket.jsx` `c234f268` 15,018 · `KrishiShare.jsx` `1fa7a46d` ·
`LangSwitcher.jsx` `4f860b82` · `LiveEncyclopedia.jsx` `ce3bad8a` 13,387 ·
`MandiPrices.jsx` `3d74ab8c` 29,503 · `OfflineBanner.jsx` `8eecc4b1` ·
`OnboardingTutorial.jsx` `bc479e8f` · `PestCalendar.jsx` `9b10899c` ·
**`ProfileModal.jsx` `cd818eb5` (R98.1)** · `ScrollTopButton.jsx` `bbacad8f` ·
`SeasonalBanner.jsx` `a0a76586` 1,694 · `SeasonalCropRecommend.jsx` `14711e60`
16,541 · **`SettingsModal.jsx` `2fbc1473` (R98)** · `SidebarDrawer.jsx`
`b3157343` 15,808 · `Skeleton.jsx` `95e90094` · `SoilHealthPlanner.jsx`
`3c7c3f6b` 17,295 · `TTSButton.jsx` `24f424a7` · `Toast.jsx` `a83b0540` ·
`Weather.jsx` `b7d227a6` **51,514** · `YieldCalc.jsx` `83dd7c12` ·
`YoutubePlayer.jsx` `fb7944d5`.

### Components that inject their own `<style>` (KL#32 applies)

`SidebarDrawer`, `ProfileModal`, `AuthModal`, `AIVoiceAssistant`. Their rules
land **after** imported CSS and win at equal specificity, so overriding them
from a stylesheet needs `!important`.

### Components writing `--clay-*` inline (all safe via the bridge)

`SettingsModal` (`var(--clay-surface-2)`), `App.jsx`
(`var(--clay-surface, var(--s1))`), `ProfileModal`, `AuthModal`,
`AIVoiceAssistant`, `SidebarDrawer`.

### Component specifics worth knowing

- **`SidebarDrawer.jsx`** - 19 `ALL_FEATURES`; lucide `{Scan, Sprout, Cloud,
  TrendingUp, FlaskConical, Calculator, Bug, Users, ShoppingCart, Landmark,
  Calendar, Leaf, BookText, Tractor, TestTube, BarChart3, Library, Video,
  PhoneCall, Settings, Moon, Sun, Monitor, Eye}` - all non-brand, all safe.
  Filters `settings.disabled_features`, sorts by `settings.feature_order`.
  Props: `isOpen, onClose, isLoggedIn, onOpenProfile, onOpenSettings, theme,
  onToggleTheme, onLoginClick`.
- **`FeatureGrid.jsx`** - 19 lazy features; `FEATURE_MAP_STATIC` +
  `DEFAULT_ORDER_STATIC` (tagged `FEATUREGRID_MAP_R96`); ids map to `sec-*`
  (`fertTracker` -> `sec-fert-tracker`); `wrapFeature` overlay dispatches
  `open-auth-modal` / `open-access-code`; **one single `<Suspense>` wraps all 19**
  (open issue).
- **`Clock.jsx`** - `.clock` 13px/700 showing `DAY hh:mm:ss`, `.mono` 11px date
  line below, `setInterval(tick, 1000)`.
- **`BackButton.jsx`** - inline `ArrowLeftIcon` SVG (`M19 12H5` /
  `m12 19-7-7 7-7`), tagged `INLINE_ARROW_R92_1`. `goBack()` =
  `location.key && location.key !== "default" ? navigate(-1) : navigate("/")`.
- **`App.jsx`** (`47351db7`, ~750 lines - **at the truncation limit, push it
  alone**) - local `InstagramIcon` (`BRAND_ICON_R90`); lucide `{Mail,
  MessageCircle, Info, Shield, FileText, HelpCircle, FileClock}`; footer
  `.ks-footer` / `.ks-social` / `.ks-social-row`; contacts
  `mailto:avishkarkedar@gmail.com`, `wa.me/918432884424`,
  `instagram.com/agrointel.ai`; `resolveTheme` / `cycleTheme` dark -> light ->
  auto.
- **`SettingsContext.jsx`** (`c6939730`) - `POLL_MS 60000`,
  `FETCH_TIMEOUT_MS 25000`, `SETTINGS_CACHE_KEY "agrointel_settings_cache"`,
  `API = import.meta.env.VITE_API_URL || "https://agrointel-backend-ucic.onrender.com"`.
  Exposes `settings.disabled_features`, `settings.feature_order`.
- **`utils/helpers.js`** (`b9788423`) - `safeGetLS` / `safeSetLS` store **RAW**
  values (not JSON), `onActivateKey`.
- **`src/pages/*`** - all six import `BackButton`. `About`, `Contact`, `FAQ`,
  `Changelog` top only; `Privacy`, `Terms` (`ac0be516`) top and bottom. Pattern:
  `<div className="main" style={{textAlign:"left"}}>`, `<h1 className="t1">`,
  then **`<div className="card" style={{padding:"30px"}}>`** - this inline
  padding is why blanket `.card` padding rules must be scoped with
  `:has(> .card-hd)` (KL#29).
- **`src/index.html`** (`48adf0a5`) - `THEME_INIT_R92_2` IIFE reads
  `agrointel_theme` raw, strips quotes, resolves `auto` via
  `getHours() >= 6 && < 18`, rewrites `theme-color`. Google Fonts `<link>`,
  inline `--sans/--serif/--mono`, `googleTranslateElementInit` with
  `includedLanguages: 'hi,mr'`.

---

## 5. Config and infra

- **`package.json`** `d14d3e03` - `agrointel-frontend@2.0.0`; scripts
  `dev`/`build`/`preview` (**no `lint` script**); deps `lucide-react ^1.24.0`,
  `react ^18.2.0`, `react-router-dom ^6.23.0`, `recharts ^3.8.1`,
  `zustand ^5.0.14`, `@marsidev/react-turnstile ^1.5.3`; devDeps `vite ^8.0.16`,
  `eslint ^10.4.1`, `@playwright/test ^1.60.0`, `vite-plugin-pwa ^1.3.0`,
  `@vitejs/plugin-react ^6.0.2`. **Never edit deps without the lockfile**
  (KL#20). `package-lock.json` `42b9b66c`.
- **`.github/workflows/e2e-tests.yml`** `b3cd3af1` - `name: AgroIntel CI/CD
  Pipeline`; `guard` job greps `from ["']lucide-react["']` for
  `BRANDS='Instagram|Twitter|Facebook|Youtube|Github|Linkedin|Slack|Figma|Chrome|Codepen|Dribbble|Gitlab|Twitch|Trello|Airplay'`
  and exits 1.
- **`eslint.config.js`** `d09bf008` - `LUCIDE_BRAND_ICONS` via
  `no-restricted-imports`.
- **`vite.config.js`** `38ee0ee7` - `root: 'src'`, `outDir: '../dist'`, SW cache
  name `agrointel-live-cache-r89`.
- **`wrangler.toml`** `7ae5eaf9` - still `name = "krishiai"` (deliberate).
- **`render.yaml`** `304ae48e` - no `healthCheckPath` (deliberate).
- `.nvmrc` = `.node-version` = `5bd68117` -> `20.19.0`.
- `setup_database.sql` `3c2720f1` - **already executed by the owner.**
- `PROJECT.md` `60178b08`, `PROJECT_KNOWLEDGE_BASE.md` `68714679`,
  `README.md` `c004a4df`.
- Build env: vite `v8.0.16` (rolldown), `vite-plugin-pwa` 1.3.0, CI path
  `/home/runner/work/AgroIntel/AgroIntel`.

### Backend (`backend/`) blobs

`main.py` `c6bea512` · `dependencies.py` `4287e3ff` · `admin.py` `9c8c6d69` ·
`community.py` `498310f8` · `ai.py` `37675718` · `ws.py` `b6e0c7f1` ·
`auth.py` `d2b078ba` · `market.py` `b520d0d9` · `superadmin.py` `97c95d8`.

`dependencies.py` contains a `GITHUB_ACTIONS` bypass that lets `import main`
succeed in CI. **Do not touch it.**

### Admin panel (`admin-panel/src/`) blobs

`glass.css` `7e170b6a` (separate app, has its own `--clay-*` - unaffected by
frontend styling work) · `FeatureToggles.jsx` `37056b73` · Export `584e61e1` ·
Messaging `7695ca5a` · FuelPrices `a4295e0f` · MandiPricesAdmin `e63a1f45` ·
News `2d2f6033` · Backup `6b07ae48` · Dashboard `08f761e6` · AdvancedSettings
`e103b0b5` · YoutubeSettings `a1b438bf` · TractorRentalsAdmin `8cb37348` ·
Announcement `1d7f616d` · FeatureAccess `2f2d7bfa` · FeatureOrder `8cff964d`.

### Environment / services

Supabase project `jbmmtcaqgestwykolaad`. Groq (shipped):
`GROQ_MODEL=llama-3.1-8b-instant`, `GROQ_VISION_MODEL=qwen/qwen3.6-27b`,
`GROQ_MODEL2=VISION_MODEL`.

**LocalStorage keys:** `agrointel_user`, `agrointel_username`,
`agrointel_liked_posts`, `agrointel_notifications`, `agrointel_theme` (default
`"auto"`, RAW), `agrointel_onboarded`, `agrointel_ann_last`,
`agrointel_bulk_msg_seen`, `agrointel_token`, `agrointel_install_dismissed`,
`agrointel_premium`, `agrointel_settings_cache`.

---

## 6. Files never read / not audited

Be honest about these rather than assuming their contents:

- **`src/pwaUpdate.js`** - never read, and imported nowhere. Resolve before
  claiming PWA update prompts work.
- **`src/components/Weather.jsx`** (51 KB) - largest unaudited component.
- **`AgroIntelScan.jsx`** (45 KB) - only partly seen; hardcodes Playfair.
- **`Community.jsx`**, **`MandiPrices.jsx`** - self-injected styles unaudited.
- Most of **`admin-panel/`**.
- The four `redesign*.css` files have **never been read end to end**. That is
  exactly why R95's removal broke the site, and why the migration procedure in
  `CONTEXT.md` insists on enumerating selectors first.
- Only `#sec-pest` was verified as having a duplicate emoji in its title text;
  the other 18 `#sec-*` were not checked.

---

## 7. UI direction history (why things look the way they do)

R81 flat editorial -> R82 token unify -> R83 vibrancy -> R84 onboarding/splash
-> R85 premium dual-theme -> R86 news ticker -> ~~R87 Linear-style~~ **dropped**
-> R88 -> R89 settings resilience + RLS fix -> R90 lucide build fix -> R91 CI
hardening + UI pass -> R91.1 conflict repair -> R91.2 grid swap -> R92/.1 back
navigation -> R92.2 FOUC + contrast -> R93 de-terminal -> R94 typography /
professionalism -> R95 design system (**broke styling**) -> R96 clay + glass
deleted from source -> R96.1 orphan vars + drawer de-glass -> R96.2 radius
aliases -> **R97 rollback** -> R98/R98.1 modal structure fixes.

**Current thesis:** quiet, dense, editorial - instruments, not toys.

Repeated owner complaints to keep in mind: too much wasted space on both sides;
footer contact/social links must be left-aligned, stacked one below another, in
small text, with professional (non-mismatched) icons; the greeting card must not
say "Good morning" at all hours; day + time with seconds above the date; icons
must not be stripped out in the name of minimalism (KL#24); disabled features
must disappear from the sidebar too.

---

## 8. The 50-suggestion list (standing work queue)

The owner asked for 50 UI/UX suggestions and then said to work them
sequentially, testing after each and checking for conflicts.

Groups: **1-10** critical/architectural · **11-20** layout and density ·
**21-30** visual polish · **31-40** accessibility · **41-50** farmer-specific UX.

"If you only do five": **#1** (stylesheet consolidation - *partially rolled
back by R97, must resume via the migration procedure*), **#3** done, **#10**
done, **#31** done, **#41** done.

The full text of the 50 items lives in the chat history, not here. If it is
needed again, regenerate it from the current state of the app rather than
assuming the old numbering is still accurate - much has shipped since.

---

## 9. Suggested next steps

1. Confirm with the owner that Settings and Profile now render correctly
   (R98/R98.1) after a hard refresh.
2. Audit the seven remaining dialogs against the modal contract in `CONTEXT.md`
   (outstanding issue 3).
3. Resolve `src/pwaUpdate.js` (issue 7) - read it, then either import or delete.
4. Fix the Video Guides wrong-video bug (issue 1) - a content/config problem in
   the YouTube admin pipeline, not CSS.
5. Only then resume the design-system migration, **one stylesheet per deploy**,
   following the procedure in `CONTEXT.md` section 2.
