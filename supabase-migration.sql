-- MockPrep — Supabase Migration
-- Run this in your Supabase project → SQL Editor

-- Add user_id column to scope sessions per user (anonymous UUID from client)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Optional: Enable RLS (Row Level Security) for production
-- Uncomment these lines when you add proper auth:
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users see only their own sessions"
--   ON sessions FOR ALL
--   USING (user_id = current_setting('app.current_user_id', true));
