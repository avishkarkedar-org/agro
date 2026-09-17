# AgroIntel: The Ultimate Project Knowledge Base
> **Version:** 2.0.0
> **Last Updated:** July 2026
> **Purpose:** This file contains EVERYTHING about the AgroIntel project. It is designed to act as the absolute source of truth for any developer, AI agent, or DevOps engineer touching this repository. 

---

## 1. 🏗️ Executive Summary & Architecture
AgroIntel is a comprehensive Agritech platform designed for Indian farmers. It provides real-time market data, AI-driven crop pathology analysis, smart weather insights, and community engagement. 

### The Stack
- **Frontend (Public App):** React 18, Vite, Zustand (State), React Router DOM, Recharts (Data Viz), Lucide-React (Iconography). PWA enabled via `vite-plugin-pwa`.
- **Frontend (Admin Panel):** React, Vite, secure JWT local-storage session management.
- **Backend API:** Python 3.12, FastAPI, Pydantic, Supabase Python Client, JWT Authentication, WebSockets (for live news).
- **Database:** PostgreSQL (Hosted on Supabase).
- **AI Models:** Groq Cloud API (Llama-3.1-8b-instant for primary speed, Llama3-70b-8192 for consensus/fallback).
- **Hosting / DevOps:** Cloudflare Pages (Frontend & Admin Panel), Render (Backend API).

---

## 2. 🔐 Environment Variables & Keys
To run this project locally or deploy it, the following keys are absolutely required:

### Backend (`backend/.env`)
| Variable | Purpose | Location / Source |
|----------|---------|-------------------|
| `GROQ_API_KEY` | Powers the AI Plant Scanner & Voice Assistant. | console.groq.com |
| `ADMIN_PASSWORD` | The default fallback password for the Superadmin account. | Secure Password Generator |
| `SUPABASE_URL` | The REST API endpoint for the database. | Supabase Dashboard |
| `SUPABASE_KEY` | The anonymous public key for safe DB calls. | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | The highly privileged key for admin operations (banning users, bulk edits). | Supabase Dashboard |
| `JWT_SECRET` | Used to cryptographically sign and verify Admin Panel login sessions. | Secure Random String |
| `DATAGOV_API_KEY` | Used to fetch real-time Mandi (market) prices from data.gov.in. | data.gov.in |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend domains. | Configured per environment |

### Frontend (`.env`)
| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | The URL of the backend (e.g. `http://localhost:8000` or `https://krishiai-backend-e9d0.onrender.com`). |

---

## 3. 🗺️ Exhaustive Application Sitemap & Feature Deep-Dive

### 🟢 Public Application (`src/`)

#### 1. Home Dashboard (`/`)
- **What it does:** The central hub for the farmer.
- **Under the hood:** Features a dynamic `FeatureGrid.jsx` which reads a configuration array from the backend `SettingsContext`. Admins can rearrange the icons here remotely without pushing code. Contains a Live News Ticker at the top that connects via **WebSockets** (`/ws/prices`) to stream real-time updates. Also checks `navigator.onLine` to show a green/red network indicator.

#### 2. AI Plant Scanner (`/scan` -> `AgroIntelScan.jsx`)
- **What it does:** Allows users to snap a photo of a sick plant and instantly know the disease and treatment.
- **Under the hood:** Uses `FileReader` to compress images on the client side. Sends a Base64 image payload to the FastAPI `/api/ai/scan` route. The backend enhances the image contrast (using Pillow) and feeds it to **Llama-3.1**. It uses strict JSON-schema prompting. If the AI is less than 85% confident, the backend automatically triggers a second pass with the larger **Llama3-70b** model to form a consensus.

#### 3. AI Voice Assistant (`/chat` -> `AIVoiceAssistant.jsx`)
- **What it does:** A voice-activated chatbot using the Web Speech API (`SpeechRecognition` & `speechSynthesis`).
- **Under the hood:** Captures voice in Hindi/Marathi/English, translates to text, sends to the backend conversational API (`/api/ai/chat`), receives the response, and reads it aloud using the native browser TTS. Features a highly polished, interactive "Bot" icon that animates while speaking.

#### 4. Live Weather (`/weather` -> `Weather.jsx`)
- **What it does:** Provides hyper-local weather forecasts and Smart Spray Windows.
- **Under the hood:** Integrates with the open-source Open-Meteo API to pull 15-day forecasts. A custom algorithm calculates if it's safe to spray pesticides based on rain probability > 30% or wind speed > 15km/h.

#### 5. Mandi Prices (`/mandi` -> `MandiPrices.jsx`)
- **What it does:** Shows live market rates for agricultural commodities.
- **Under the hood:** The backend tries to fetch from `data.gov.in`. If that fails (which it often does due to geo-blocking on Render), it seamlessly falls back to a web-scraper (`BeautifulSoup`) targeting `agmarknet.gov.in`. 

#### 6. Fertilizer Calculator (`/fert` -> `FertCalc.jsx`)
- **What it does:** Tells the farmer exactly how much Urea, DAP, and MOP to buy.
- **Under the hood:** Uses standard ICAR (Indian Council of Agricultural Research) NPK ratio formulas. The user inputs their land size (Acres/Hectares) and target crop. The component calculates precise kilogram requirements.

#### 7. Farmer Community (`/community` -> `Community.jsx`)
- **What it does:** A Reddit-style anonymous message board.
- **Under the hood:** Posts and Replies are stored in Supabase `posts`. To prevent abuse, the backend aggressively sanitizes HTML inputs and checks for SQL injection patterns before saving. Supports Cloudflare Turnstile for bot-protection.

#### 8. PWA Infrastructure (`App.jsx`)
- **What it does:** Allows the website to be "Installed" as an app on Android/iOS.
- **Under the hood:** Uses `vite-plugin-pwa` with `workbox`. An automatic update prompt (a sleek glassmorphism modal) appears when the Service Worker detects a new version of the app.

---

### 🔴 Admin Panel (`admin-panel/src/`)

#### 1. Security & Login (`/login`)
- **Under the hood:** Uses `CryptContext` (bcrypt) on the backend to hash passwords. Issues a JWT token with a 24-hour expiry. Features a robust brute-force protector (5 failed logins = 5-minute IP lockout).

#### 2. Settings Controller (`/settings`)
- **What it does:** The ultimate remote control for the app.
- **Under the hood:** Modifies row ID `1` in the Supabase `settings` table. Changes made here immediately propagate to all connected clients. Controls the YouTube video ID, announcement banners, Maintenance Mode, and which features require a "Premium Access Code".

#### 3. Access Codes Monetization (`/access-codes`)
- **What it does:** Allows the business to generate premium codes to sell to farmers.
- **Under the hood:** Generates secure random strings. When a user inputs this code on the public app, it checks the Supabase `access_codes` table. If valid, the global `SettingsContext` emits a `agrointel-premium-change` event, instantly unlocking premium modules across the entire UI without a page refresh.

#### 4. Analytics & Telemetry (`/analytics`)
- **What it does:** Tracks app health and AI costs.
- **Under the hood:** The backend maintains an in-memory dictionary `_ai_usage` tracking exact token counts consumed by Groq. It also tracks API error rates and rate-limited IPs.

#### 5. User Management & Danger Zone (`/users`, `/superadmin`)
- **What it does:** Allows moderation and system resets.
- **Under the hood:** Admins can ban users (stored in `user_bans` table) which blocks their IP address at the API middleware layer. Superadmins can wipe caches or trigger manual background scrapes.

---

## 4. 🗄️ Database Schema Details (Supabase PostgreSQL)

| Table Name | Purpose | Critical Columns |
|------------|---------|------------------|
| `settings` | The global configuration singleton | `id` (always 1), `maintenance_mode` (boolean), `announcement` (text), `feature_order` (JSONB) |
| `admins` | Admin credentials | `username`, `password_hash`, `role` ('admin' or 'superadmin') |
| `posts` | Community forum threads | `id`, `title`, `body`, `author`, `created_at` |
| `replies` | Comments on forum threads | `id`, `post_id` (FK), `body`, `author` |
| `access_codes` | Premium keys | `code`, `max_uses`, `expires_at`, `created_by` |
| `user_bans` | Moderation blocklist | `ip_or_fingerprint`, `reason`, `expires_at` |
| `audit_logs` | Security tracking | `admin_username`, `action`, `details` (JSONB), `created_at` |

---

## 5. 🛡️ Advanced Engineering & Security Mechanisms

1. **Self-Healing Backend:** The FastAPI backend runs a background task (`background_data_fetcher`) every 6 hours. It asynchronously fetches Mandi, Fuel, and News data. It uses `asyncio.timeout(60.0)` so if an external API hangs, the backend won't freeze; it just serves the stale cached data.
2. **WebSocket Broadcasts:** When the background task successfully fetches new data, it iterates through the `ConnectionManager.active_connections` set and broadcasts `{"type": "prices_updated"}`. The React frontend listens to this and instantly updates the news ticker without the user refreshing.
3. **Smart Rate Limiting:** The backend extracts the true client IP from `X-Forwarded-For` or `CF-Connecting-IP` headers to prevent abusers from bypassing limits using proxies.
4. **Maintenance Backoff:** If the database goes down, the backend caches the failure state for 60 seconds (`MAINT_CACHE_TTL`). This prevents thousands of user requests from creating a self-inflicted DDoS attack on a struggling database connection.
5. **No JWT on Public WebSockets:** To ensure immediate updates for unauthenticated farmers, the `/ws/prices` endpoint explicitly does NOT require a JWT token, relying entirely on CORS and Rate Limiting for protection.

---

## 6. 🚀 CI/CD & Deployment Workflow

The project utilizes a strict Git Flow methodology:
1. **`main` Branch:** The immutable production branch. Direct pushes to this branch are prohibited during active feature development. Any push to `main` instantly triggers live builds on Render (Backend) and Cloudflare/Netlify (Frontend).
2. **`staging` Branch:** The development branch. Code is pushed here first.
   - Pushing to `staging` automatically spins up a **Preview Deployment URL** (e.g., `staging.agrointel.pages.dev`).
   - A parallel Render Staging Web Service (`krishiai-backend-staging`) runs connected to this branch.
3. **Merging:** Once a feature is verified on the staging URL, a Pull Request is merged into `main`, taking it live.

---
> *This document was auto-generated to serve as a persistent context beacon. Any AI agent assuming control of this repository MUST refer to this file before suggesting architectural overhauls.*
