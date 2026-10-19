-- Mane Meals accounts (see docs/ACCESS.md). The sign-in functions also create
-- these automatically the first time they run, so running this is optional.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  env TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_day TEXT NOT NULL,
  source TEXT NOT NULL,
  code_id TEXT,
  session_version INTEGER NOT NULL DEFAULT 1,
  disabled INTEGER NOT NULL DEFAULT 0,
  last_seen_day TEXT,
  UNIQUE (env, email)
);

CREATE TABLE IF NOT EXISTS user_days (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS sign_in_codes (
  env TEXT NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sends INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  new_source TEXT,
  new_code_id TEXT,
  PRIMARY KEY (env, email)
);
