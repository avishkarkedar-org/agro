# Project: KrishiAI Mobile Navigation & Profile/Settings Update

## Architecture
- **Frontend**: Mobile sidebar (hamburger menu), user state management, Profile & Settings modals/pages.
- **Backend**: FastAPI backend serving auth / user profile endpoints.
- **Database**: Supabase PostgreSQL DB (`users` table).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Architecture Exploration | Codebase inspection & strategy planning | none | IN_PROGRESS |
| 2 | Backend & Migration | `supabase_migration.sql` + FastAPI profile API | M1 | PLANNED |
| 3 | Mobile Sidebar UI | Reorganize mobile menu (Profile/Theme top, Settings bottom) | M1 | PLANNED |
| 4 | Profile & Settings Features | Profile modal (edit Name/Village, logout) + Settings modal | M2, M3 | PLANNED |
| 5 | Verification & Audit | E2E test verification & forensic integrity check | M4 | PLANNED |

## Interface Contracts
### User Profile Endpoint
- `GET /api/user/profile` or similar: returns user profile including `name`, `village`.
- `PUT/POST /api/user/profile` or similar: updates `name`, `village`.

## Code Layout
- Root project directory: `c:\Users\Dell\Desktop\KrishiAI\krishiai-v13-fixed\krishiai-final2`
- Agent metadata: `.agents/`
