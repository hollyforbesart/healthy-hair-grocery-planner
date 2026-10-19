/**
 * Mane Meals accounts, stored in the same Cloudflare D1 database as the usage
 * statistics. Each account is an email address, how it was created, and the
 * days it was used (for "how many people use it, and do they come back").
 * Plans themselves stay in each person's browser.
 */
import type { D1Database } from './cloudflareTypes';

/** The tables, created automatically the first time they're needed (also in migrations/0002_accounts.sql). */
export const ACCOUNT_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
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
  )`,
  `CREATE TABLE IF NOT EXISTS user_days (
    user_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    PRIMARY KEY (user_id, day)
  )`,
  `CREATE TABLE IF NOT EXISTS sign_in_codes (
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
  )`,
];

const ready = new WeakSet<D1Database>();

export async function ensureAccountTables(db: D1Database): Promise<void> {
  if (ready.has(db)) return;
  for (const sql of ACCOUNT_TABLES) await db.prepare(sql).run();
  ready.add(db);
}

/** How an account was first created. */
export type AccountSource = 'code' | 'guest' | 'kit';

export interface User {
  id: number;
  email: string;
  source: AccountSource;
  session_version: number;
  disabled: number;
}

const today = (now: number) => new Date(now).toISOString().slice(0, 10);

export const findUserByEmail = (db: D1Database, env: string, email: string) =>
  db.prepare('SELECT id, email, source, session_version, disabled FROM users WHERE env = ? AND email = ?').bind(env, email).first<User>();

export const findUserById = (db: D1Database, id: number) =>
  db.prepare('SELECT id, email, source, session_version, disabled FROM users WHERE id = ?').bind(id).first<User>();

export async function createUser(
  db: D1Database,
  env: string,
  email: string,
  source: AccountSource,
  codeId: string | null,
  now = Date.now(),
): Promise<User> {
  await db
    .prepare('INSERT OR IGNORE INTO users (env, email, created_at, created_day, source, code_id) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(env, email, new Date(now).toISOString(), today(now), source, codeId)
    .run();
  return (await findUserByEmail(db, env, email))!;
}

/** Notes that this account used the planner today (once per day). */
export async function recordActiveDay(db: D1Database, userId: number, now = Date.now()): Promise<void> {
  const day = today(now);
  await db.prepare('INSERT OR IGNORE INTO user_days (user_id, day) VALUES (?, ?)').bind(userId, day).run();
  await db.prepare('UPDATE users SET last_seen_day = ? WHERE id = ?').bind(day, userId).run();
}

export interface PendingSignIn {
  code_hash: string;
  expires_at: number;
  attempts: number;
  sends: number;
  window_start: number;
  new_source: AccountSource | null;
  new_code_id: string | null;
}

export const SIGN_IN_CODE_MINUTES = 15;
export const MAX_SENDS_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;

export const findPendingSignIn = (db: D1Database, env: string, email: string) =>
  db
    .prepare(
      'SELECT code_hash, expires_at, attempts, sends, window_start, new_source, new_code_id FROM sign_in_codes WHERE env = ? AND email = ?',
    )
    .bind(env, email)
    .first<PendingSignIn>();

/** Saves a new sign-in code, or returns false if this email has had too many codes in the last hour. */
export async function savePendingSignIn(
  db: D1Database,
  env: string,
  email: string,
  codeHash: string,
  newAccount: { source: AccountSource; codeId: string | null } | null,
  now = Date.now(),
): Promise<boolean> {
  const existing = await findPendingSignIn(db, env, email);
  const sameWindow = existing && now - existing.window_start < 60 * 60 * 1000;
  const sends = sameWindow ? existing.sends + 1 : 1;
  if (sends > MAX_SENDS_PER_HOUR) return false;
  await db
    .prepare(
      `INSERT OR REPLACE INTO sign_in_codes (env, email, code_hash, expires_at, attempts, sends, window_start, new_source, new_code_id)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    )
    .bind(
      env,
      email,
      codeHash,
      now + SIGN_IN_CODE_MINUTES * 60 * 1000,
      sends,
      sameWindow ? existing.window_start : now,
      newAccount?.source ?? null,
      newAccount?.codeId ?? null,
    )
    .run();
  return true;
}

export const countFailedAttempt = (db: D1Database, env: string, email: string) =>
  db.prepare('UPDATE sign_in_codes SET attempts = attempts + 1 WHERE env = ? AND email = ?').bind(env, email).run();

/** A used code can't be used again (the hourly send count is kept). */
export const usePendingSignIn = (db: D1Database, env: string, email: string) =>
  db.prepare('UPDATE sign_in_codes SET code_hash = ?, expires_at = 0 WHERE env = ? AND email = ?').bind('', env, email).run();

/** Account numbers for the dashboard: never emails. */
export async function accountStats(db: D1Database, env: string, from: string, to: string) {
  await ensureAccountTables(db);
  const one = async (sql: string, ...binds: unknown[]) =>
    ((await db.prepare(sql).bind(...binds).first<{ n: number }>())?.n ?? 0) as number;
  const all = async <T,>(sql: string, ...binds: unknown[]) => (await db.prepare(sql).bind(...binds).all<T>()).results;
  const daysBefore = (n: number) => new Date(Date.parse(`${to}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
  const activeSince = (day: string) =>
    one('SELECT COUNT(DISTINCT d.user_id) AS n FROM user_days d JOIN users u ON u.id = d.user_id WHERE u.env = ? AND d.day >= ?', env, day);

  const [total, newInRange, activeToday, active7, active30, returning, eligibleAfterWeek, cameBackAfterWeek, bySource, daily, byCode] =
    await Promise.all([
      one('SELECT COUNT(*) AS n FROM users WHERE env = ?', env),
      one('SELECT COUNT(*) AS n FROM users WHERE env = ? AND created_day >= ?', env, from),
      activeSince(to),
      activeSince(daysBefore(6)),
      activeSince(daysBefore(29)),
      one(
        `SELECT COUNT(*) AS n FROM (SELECT d.user_id FROM user_days d JOIN users u ON u.id = d.user_id
         WHERE u.env = ? AND d.day >= ? GROUP BY d.user_id HAVING COUNT(*) >= 2)`,
        env,
        from,
      ),
      one(`SELECT COUNT(*) AS n FROM users WHERE env = ? AND created_day <= ?`, env, daysBefore(7)),
      one(
        `SELECT COUNT(DISTINCT u.id) AS n FROM users u JOIN user_days d ON d.user_id = u.id
         WHERE u.env = ? AND d.day >= date(u.created_day, '+7 day')`,
        env,
      ),
      all<{ source: string; count: number }>('SELECT source, COUNT(*) AS count FROM users WHERE env = ? GROUP BY source', env),
      all<{ day: string; activeUsers: number; newAccounts: number }>(
        `SELECT d.day AS day, COUNT(DISTINCT d.user_id) AS activeUsers,
                SUM(CASE WHEN u.created_day = d.day THEN 1 ELSE 0 END) AS newAccounts
         FROM user_days d JOIN users u ON u.id = d.user_id WHERE u.env = ? AND d.day >= ? GROUP BY d.day ORDER BY d.day`,
        env,
        from,
      ),
      all<{ code: string; count: number }>(
        `SELECT code_id AS code, COUNT(*) AS count FROM users WHERE env = ? AND source = 'code' GROUP BY code_id ORDER BY count DESC`,
        env,
      ),
    ]);

  return {
    total,
    newInRange,
    activeToday,
    activeLast7Days: active7,
    activeLast30Days: active30,
    /** Used it on 2 or more different days in this period. */
    returningInRange: returning,
    /** Of accounts at least a week old: how many used it again a week or more after signing up. */
    cameBackAfterFirstWeek: { accounts: eligibleAfterWeek, cameBack: cameBackAfterWeek },
    bySource: Object.fromEntries(bySource.map((r) => [r.source, r.count])),
    daily,
    /** Accounts per access code (a short fingerprint, not the code), to spot a code being shared. */
    byAccessCode: byCode,
  };
}
