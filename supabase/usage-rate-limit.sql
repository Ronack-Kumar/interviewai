-- MockPrep — Usage Rate Limiting Migration
-- Run in Supabase SQL Editor: Project → SQL Editor → New Query → Paste → Run
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).

-- ── Usage daily counter ──────────────────────────────────────────────────────
-- Tracks AI call count per user per day.
-- user_key format:
--   authenticated users  → their Supabase auth.users UUID
--   guests               → 'guest:<sha256_of_ip_first_16_chars>'
CREATE TABLE IF NOT EXISTS public.usage_daily (
  id          BIGSERIAL PRIMARY KEY,
  user_key    TEXT        NOT NULL,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  call_count  INTEGER     NOT NULL DEFAULT 0,
  last_called TIMESTAMPTZ          DEFAULT NOW(),
  UNIQUE (user_key, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_key_date
  ON public.usage_daily (user_key, date);

-- ── AI usage log (observability) ─────────────────────────────────────────────
-- Append-only log of every AI call attempt for quota monitoring.
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id          BIGSERIAL PRIMARY KEY,
  user_key    TEXT,
  route       TEXT,         -- e.g. 'feedback', 'questions', 'hint'
  provider    TEXT,         -- 'groq' | 'gemini' | 'none'
  success     BOOLEAN,
  latency_ms  INTEGER,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_key
  ON public.ai_usage_log (user_key);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at
  ON public.ai_usage_log (created_at DESC);

-- ── RLS (Row Level Security) ─────────────────────────────────────────────────
-- These tables are written to via SUPABASE_SERVICE_KEY (server-side only).
-- No client-side access is required — keep RLS enabled but do not expose
-- to anon/authenticated roles (service role bypasses RLS by design).
ALTER TABLE public.usage_daily   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log  ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT policies for anon or authenticated roles.
-- Only the service_role (used in API routes) can read/write these tables.
