-- Run after: npx better-auth generate (creates Better Auth core tables)

CREATE TABLE IF NOT EXISTS user_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_status (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  feed TEXT NOT NULL CHECK (feed IN ('calendar', 'meteo')),
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  UNIQUE (user_id, feed)
);
