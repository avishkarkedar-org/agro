-- ============================================================
-- AgroIntel Universal Complete Database Setup (Supabase)
-- Safe, Idempotent, and Non-Destructive
-- Run this in the Supabase SQL Editor to ensure all tables,
-- columns, indexes, and RLS policies are 100% complete and up-to-date.
-- ============================================================

-- ------------------------------------------------------------
-- STEP 1: CREATE TABLES (IF NOT ALREADY EXISTING)
-- ------------------------------------------------------------

-- 1. Settings Table (Global Application Configuration)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    site_title TEXT DEFAULT 'AgroIntel',
    youtube_id TEXT DEFAULT '',
    announcement TEXT DEFAULT '',
    ann_image TEXT DEFAULT '',
    ann_start_date TEXT DEFAULT '',
    ann_end_date TEXT DEFAULT '',
    bulk_message TEXT DEFAULT '',
    maintenance_mode BOOLEAN DEFAULT false,
    maintenance_schedule JSONB DEFAULT '{}'::jsonb,
    rate_limit_config JSONB DEFAULT '{"max_req": 20, "window": 60}'::jsonb,
    mandi_prices JSONB DEFAULT '[]'::jsonb,
    fuel_prices JSONB DEFAULT '[]'::jsonb,
    rentals JSONB DEFAULT '[]'::jsonb,
    verified_experts JSONB DEFAULT '[]'::jsonb,
    custom_news JSONB DEFAULT '[]'::jsonb,
    disabled_features JSONB DEFAULT '[]'::jsonb,
    feature_order JSONB DEFAULT '[]'::jsonb,
    login_required_features JSONB DEFAULT '[]'::jsonb,
    blocked_ips JSONB DEFAULT '[]'::jsonb,
    access_code_setting JSONB DEFAULT '{}'::jsonb,
    admin_profiles JSONB DEFAULT '{}'::jsonb,
    voice_settings JSONB DEFAULT '{}'::jsonb,
    advanced_features JSONB DEFAULT '{}'::jsonb,
    ai_settings JSONB DEFAULT '{}'::jsonb,
    ws_settings JSONB DEFAULT '{}'::jsonb,
    gql_settings JSONB DEFAULT '{}'::jsonb,
    weather_settings JSONB DEFAULT '{}'::jsonb
);

-- 2. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    force_logout_ts TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    security_policy JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. App Users Table (Farmer Profiles & Authentication)
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    name TEXT DEFAULT '',
    village TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Access Codes Table (Tier & Access Code Management)
CREATE TABLE IF NOT EXISTS access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL DEFAULT 'standard',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_uses INTEGER DEFAULT NULL,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Community Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author TEXT DEFAULT 'Farmer',
    user_email TEXT DEFAULT '',
    loc TEXT DEFAULT '',
    tag TEXT DEFAULT 'General',
    emoji TEXT DEFAULT '🧑‍🌾',
    likes INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    time TEXT DEFAULT '',
    ts BIGINT DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Mandi Price History Table
CREATE TABLE IF NOT EXISTS mandi_history (
    id SERIAL PRIMARY KEY,
    market TEXT NOT NULL,
    commodity TEXT NOT NULL,
    min_price REAL DEFAULT 0,
    max_price REAL DEFAULT 0,
    modal_price REAL DEFAULT 0,
    snapshot_date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_mandi_snapshot UNIQUE(commodity, market, snapshot_date)
);

-- 7. Plant Scan Logs Table
CREATE TABLE IF NOT EXISTS scan_logs (
    id SERIAL PRIMARY KEY,
    ts BIGINT,
    crop TEXT,
    disease TEXT,
    severity TEXT,
    confidence INTEGER DEFAULT 0,
    ambiguous BOOLEAN DEFAULT false,
    lang TEXT DEFAULT 'en',
    ip TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Crop Doctor Chat Logs Table
CREATE TABLE IF NOT EXISTS chat_logs (
    id SERIAL PRIMARY KEY,
    question TEXT,
    crop TEXT DEFAULT '',
    disease TEXT DEFAULT '',
    answer TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Bug Reports Kanban Table
CREATE TABLE IF NOT EXISTS bug_reports (
    id SERIAL PRIMARY KEY,
    user_identifier TEXT DEFAULT 'Anonymous',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs Table (Admin Actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Settings History Table (Config Snapshots)
CREATE TABLE IF NOT EXISTS settings_history (
    id SERIAL PRIMARY KEY,
    changed_by TEXT NOT NULL,
    old_settings JSONB NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Visitors Tracking Table
CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    ip TEXT,
    page TEXT DEFAULT '/',
    ua TEXT DEFAULT '',
    time TEXT DEFAULT '',
    ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Login Activity Table
CREATE TABLE IF NOT EXISTS login_activity (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. User Bans Table (IP & Fingerprint Defense)
CREATE TABLE IF NOT EXISTS user_bans (
    id SERIAL PRIMARY KEY,
    ip_or_fingerprint TEXT NOT NULL,
    reason TEXT DEFAULT 'Violation of terms',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. API Metrics Table (Traffic Analytics & Latency)
CREATE TABLE IF NOT EXISTS api_metrics (
    id SERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    response_time_ms INTEGER DEFAULT 0,
    status_code INTEGER NOT NULL,
    ip_address TEXT DEFAULT '',
    ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- STEP 2: ENSURE ALL COLUMNS EXIST (NON-DESTRUCTIVE MIGRATIONS)
-- ------------------------------------------------------------

-- Settings Columns
ALTER TABLE settings ADD COLUMN IF NOT EXISTS site_title TEXT DEFAULT 'AgroIntel';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS youtube_id TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS announcement TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ann_image TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ann_start_date TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ann_end_date TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bulk_message TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_schedule JSONB DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS rate_limit_config JSONB DEFAULT '{"max_req": 20, "window": 60}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS mandi_prices JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS fuel_prices JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS rentals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS verified_experts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS custom_news JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS disabled_features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS feature_order JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS login_required_features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS blocked_ips JSONB DEFAULT '[]'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS access_code_setting JSONB DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_profiles JSONB DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS advanced_features JSONB DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ws_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gql_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS weather_settings JSONB DEFAULT '{}'::jsonb;

-- Admins Columns
ALTER TABLE admins ADD COLUMN IF NOT EXISTS force_logout_ts TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS security_policy JSONB DEFAULT '{}'::jsonb;

-- App Users Columns
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS village TEXT DEFAULT '';

-- Posts Columns
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_email TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ts BIGINT DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;

-- Visitors Columns
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '';

-- ------------------------------------------------------------
-- STEP 3: HIGH-PERFORMANCE INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tag ON posts(tag);
CREATE INDEX IF NOT EXISTS idx_mandi_history_date ON mandi_history(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_mandi_history_commodity ON mandi_history(commodity);
CREATE INDEX IF NOT EXISTS idx_visitors_ts ON visitors(ts DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON scan_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_bans_ip ON user_bans(ip_or_fingerprint);
CREATE INDEX IF NOT EXISTS idx_api_metrics_ts ON api_metrics(ts DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_ts ON login_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);

-- ------------------------------------------------------------
-- STEP 4: SEED INITIAL ROW IN SETTINGS (IF NOT PRESENT)
-- ------------------------------------------------------------
INSERT INTO settings (id, site_title, maintenance_mode)
VALUES (1, 'AgroIntel', false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- STEP 5: ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
-- ------------------------------------------------------------
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to prevent conflicts, then re-create
DO $$
BEGIN
    DROP POLICY IF EXISTS "Full access settings" ON settings;
    DROP POLICY IF EXISTS "Full access admins" ON admins;
    DROP POLICY IF EXISTS "Full access app_users" ON app_users;
    DROP POLICY IF EXISTS "Full access access_codes" ON access_codes;
    DROP POLICY IF EXISTS "Full access posts" ON posts;
    DROP POLICY IF EXISTS "Full access mandi_history" ON mandi_history;
    DROP POLICY IF EXISTS "Full access scan_logs" ON scan_logs;
    DROP POLICY IF EXISTS "Full access chat_logs" ON chat_logs;
    DROP POLICY IF EXISTS "Full access bug_reports" ON bug_reports;
    DROP POLICY IF EXISTS "Full access audit_logs" ON audit_logs;
    DROP POLICY IF EXISTS "Full access settings_history" ON settings_history;
    DROP POLICY IF EXISTS "Full access visitors" ON visitors;
    DROP POLICY IF EXISTS "Full access login_activity" ON login_activity;
    DROP POLICY IF EXISTS "Full access user_bans" ON user_bans;
    DROP POLICY IF EXISTS "Full access api_metrics" ON api_metrics;
END $$;

CREATE POLICY "Full access settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access admins" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access access_codes" ON access_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access posts" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access mandi_history" ON mandi_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access scan_logs" ON scan_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access chat_logs" ON chat_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access bug_reports" ON bug_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access settings_history" ON settings_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access visitors" ON visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access login_activity" ON login_activity FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access user_bans" ON user_bans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access api_metrics" ON api_metrics FOR ALL USING (true) WITH CHECK (true);



