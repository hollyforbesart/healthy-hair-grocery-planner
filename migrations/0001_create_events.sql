-- Anonymous usage events for the Mane Meals planner (see docs/ANALYTICS.md).
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,       -- ISO time (UTC)
  day TEXT NOT NULL,      -- YYYY-MM-DD (UTC)
  env TEXT NOT NULL,      -- live | preview | dev
  name TEXT NOT NULL,     -- event name, e.g. meal_added
  value TEXT,             -- meal/ingredient ID or short label
  device TEXT NOT NULL    -- app | mobile | desktop
);
CREATE INDEX IF NOT EXISTS events_env_day ON events (env, day);
CREATE INDEX IF NOT EXISTS events_name ON events (name);
