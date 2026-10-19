import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest as gate } from '../../functions/_middleware';
import { onRequestGet as me } from '../../functions/api/auth/me';
import { onRequestPost as signout } from '../../functions/api/auth/signout';
import { onRequestPost as start } from '../../functions/api/auth/start';
import { onRequestPost as verify } from '../../functions/api/auth/verify';
import {
  SESSION_COOKIE,
  createSessionToken,
  isPublicPath,
  normalizeCode,
  parseCodes,
  parseEmails,
  readCookie,
  readSessionToken,
  signInEnabled,
} from './access';
import { accountStats, createUser, ensureAccountTables } from './accounts';
import type { D1Database, Env } from './cloudflareTypes';

const SECRET = 'test-session-secret-0123456789';
const CODE = 'MANE-7KQ4-X9TP';
const SITE = 'https://manemeals.thehairlossnutritionist.com';

/** Cloudflare D1, played by Node's built-in SQLite. */
function memoryD1(): D1Database & { sql: DatabaseSync } {
  const sql = new DatabaseSync(':memory:');
  return {
    sql,
    prepare(query: string) {
      let values: unknown[] = [];
      const statement = {
        bind: (...v: unknown[]) => {
          values = v;
          return statement;
        },
        run: async () => sql.prepare(query).run(...values),
        all: async <T,>() => ({ results: sql.prepare(query).all(...values) as T[] }),
        first: async <T,>() => (sql.prepare(query).get(...values) as T | undefined) ?? null,
      };
      return statement;
    },
  };
}

let sentEmails: { to: string; text: string }[] = [];
let kitTags: Record<string, string[]> = {};

beforeEach(() => {
  sentEmails = [];
  kitTags = {};
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input.startsWith('https://api.resend.com/')) {
      const body = JSON.parse(String(init?.body));
      sentEmails.push({ to: body.to[0], text: body.text });
      return new Response('{"id":"1"}', { status: 200 });
    }
    if (input.startsWith('https://api.kit.com/v4/subscribers?')) {
      const email = new URL(input).searchParams.get('email_address')!;
      return Response.json({ subscribers: kitTags[email] ? [{ id: 42, email_address: email }] : [] });
    }
    if (input.startsWith('https://api.kit.com/v4/subscribers/42/tags')) {
      return Response.json({ tags: (Object.values(kitTags)[0] ?? []).map((name, i) => ({ id: i + 1, name })) });
    }
    throw new Error(`Unexpected fetch: ${input}`);
  });
});
afterEach(() => vi.unstubAllGlobals());

const lastCode = () => sentEmails.at(-1)!.text.match(/(\d{3}) (\d{3})/)!.slice(1).join('');

const makeEnv = (extra: Partial<Env> = {}): Env => ({
  DB: memoryD1(),
  SESSION_SECRET: SECRET,
  ACCESS_CODES: `${CODE}, OTHER-CODE-99`,
  GUEST_EMAILS: 'holly@example.com, mentor@example.com',
  RESEND_API_KEY: 're_test',
  ASSETS: { fetch: async () => new Response('<html>sign-in page</html>') },
  ...extra,
});

const post = (fn: typeof start, env: Env, path: string, body: unknown, origin = SITE) =>
  fn({
    env,
    request: new Request(`${SITE}${path}`, {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', Origin: origin },
    }),
  });

/** Runs the whole sign-in and returns the session cookie. */
async function signIn(env: Env, email: string, code?: string) {
  const started = await post(start, env, '/api/auth/start', { email, code });
  expect(started.status, await started.clone().text()).toBe(200);
  const verified = await post(verify, env, '/api/auth/verify', { email, code: lastCode() });
  expect(verified.status).toBe(200);
  return verified.headers.get('Set-Cookie')!.split(';')[0];
}

describe('codes, emails and sessions', () => {
  it('reads settings however they are typed', () => {
    expect(normalizeCode(' mane-7kq4 x9tp ')).toBe('MANE7KQ4X9TP');
    expect(parseCodes('MANE-7KQ4-X9TP, second-code-22\nabc')).toEqual(['MANE7KQ4X9TP', 'SECONDCODE22']);
    expect(parseEmails(' Holly@Example.com; not-an-email, b@c.co ')).toEqual(['holly@example.com', 'b@c.co']);
  });

  it('only switches sign-in on once everything it needs is set', () => {
    expect(signInEnabled({})).toBe(false);
    expect(signInEnabled({ SESSION_SECRET: SECRET, ACCESS_CODES: CODE })).toBe(false); // no database
    expect(signInEnabled(makeEnv())).toBe(true);
  });

  it('verifies its own session cookies and rejects forged ones', async () => {
    const token = await createSessionToken(SECRET, { userId: 7, version: 2 });
    expect(await readSessionToken(token, SECRET)).toEqual({ userId: 7, version: 2 });
    expect(await readSessionToken(token, 'another-secret')).toBeNull();
    expect(await readSessionToken(token.replace('s1.7.', 's1.8.'), SECRET)).toBeNull();
    expect(await readSessionToken(undefined, SECRET)).toBeNull();
    expect(readCookie(`a=1; ${SESSION_COOKIE}=${token}; b=2`, SESSION_COOKIE)).toBe(token);
  });

  it('knows which paths are public', () => {
    for (const p of ['/access', '/welcome', '/terms', '/public-assets/access-1.js', '/brand/mane-meals-phone.webp', '/favicon.png']) {
      expect(isPublicPath(p), p).toBe(true);
    }
    for (const p of ['/', '/planner', '/assets/index-1.js', '/meal-photos/jerk-chicken-pasta.webp', '/nutrients/iron.webp']) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});

describe('signing up and signing in', () => {
  it('sets up a new buyer with the access code from their purchase', async () => {
    const env = makeEnv();
    const cookie = await signIn(env, 'Buyer@Example.com', 'mane 7kq4 x9tp');
    expect(sentEmails[0].to).toBe('buyer@example.com');
    expect(sentEmails[0].text).toContain('Welcome to Mane Meals');
    const row = (env.DB as ReturnType<typeof memoryD1>).sql.prepare('SELECT * FROM users').get() as Record<string, unknown>;
    expect(row).toMatchObject({ email: 'buyer@example.com', source: 'code', env: 'live' });
    expect(String(row.code_id)).not.toContain('7KQ4'); // the code itself is never stored

    // Next time, on another device: just the email.
    const again = await post(start, env, '/api/auth/start', { email: 'buyer@example.com' });
    expect(await again.json()).toEqual({ ok: true, newAccount: false });
    expect(sentEmails[1].text).toContain('sign in to Mane Meals');
    expect(cookie).toMatch(/^mm_session=s1\./);
  });

  it('sets secure, http-only session cookies', async () => {
    const env = makeEnv();
    await post(start, env, '/api/auth/start', { email: 'holly@example.com' });
    const res = await post(verify, env, '/api/auth/verify', { email: 'holly@example.com', code: lastCode() });
    const cookie = res.headers.get('Set-Cookie')!;
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(cookie).toContain(flag);
  });

  it('lets people on the guest list in without a code', async () => {
    const env = makeEnv();
    await signIn(env, 'mentor@example.com');
    const row = (env.DB as ReturnType<typeof memoryD1>).sql.prepare('SELECT source FROM users').get();
    expect(row).toEqual({ source: 'guest' });
  });

  it('can let Kit buyers in with just their email', async () => {
    const env = makeEnv({ KIT_API_KEY: 'kit_test', KIT_BUYER_TAG: 'Mane Meals buyer' });
    kitTags['kitbuyer@example.com'] = ['Newsletter', 'Mane Meals Buyer'];
    await signIn(env, 'kitbuyer@example.com');
    kitTags = { 'notbuyer@example.com': ['Newsletter'] };
    expect((await post(start, env, '/api/auth/start', { email: 'notbuyer@example.com' })).status).toBe(404);
  });

  it('explains when there is no account, or the access code is wrong', async () => {
    const env = makeEnv();
    const none = await post(start, env, '/api/auth/start', { email: 'someone@example.com' });
    expect(none.status).toBe(404);
    expect(await none.json()).toMatchObject({ reason: 'no-account' });
    const wrong = await post(start, env, '/api/auth/start', { email: 'someone@example.com', code: 'GUESS-1234' });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toMatchObject({ reason: 'code' });
    expect((await post(start, env, '/api/auth/start', { email: 'not an email' })).status).toBe(400);
    expect(sentEmails).toHaveLength(0);
  });

  it('refuses wrong, reused and guessed sign-in codes', async () => {
    const env = makeEnv();
    await post(start, env, '/api/auth/start', { email: 'holly@example.com' });
    const right = lastCode();
    const wrong = right === '000000' ? '111111' : '000000';
    expect((await post(verify, env, '/api/auth/verify', { email: 'holly@example.com', code: wrong })).status).toBe(401);
    expect((await post(verify, env, '/api/auth/verify', { email: 'holly@example.com', code: right })).status).toBe(200);
    expect((await post(verify, env, '/api/auth/verify', { email: 'holly@example.com', code: right })).status).toBe(400); // used

    await post(start, env, '/api/auth/start', { email: 'holly@example.com' });
    const fresh = lastCode();
    for (let i = 0; i < 5; i += 1) await post(verify, env, '/api/auth/verify', { email: 'holly@example.com', code: wrong });
    const locked = await post(verify, env, '/api/auth/verify', { email: 'holly@example.com', code: fresh });
    expect(locked.status).toBe(400);
    expect(await locked.json()).toMatchObject({ reason: 'expired' });
  });

  it('limits how many codes one email can get in an hour', async () => {
    const env = makeEnv();
    for (let i = 0; i < 5; i += 1) expect((await post(start, env, '/api/auth/start', { email: 'holly@example.com' })).status).toBe(200);
    expect((await post(start, env, '/api/auth/start', { email: 'holly@example.com' })).status).toBe(429);
  });

  it('refuses requests from other websites, and explains when sign-in is not set up', async () => {
    const env = makeEnv();
    expect((await post(start, env, '/api/auth/start', { email: 'holly@example.com' }, 'https://evil.example')).status).toBe(403);
    expect((await post(verify, env, '/api/auth/verify', { email: 'holly@example.com', code: '123456' }, 'https://evil.example')).status).toBe(403);
    expect((await post(start, makeEnv({ RESEND_API_KEY: undefined }), '/api/auth/start', { email: 'holly@example.com' })).status).toBe(503);
    expect((await post(start, env, '/api/auth/start', 'not json')).status).toBe(400);
  });

  it('keeps preview accounts separate from the live site', async () => {
    const env = makeEnv();
    await signIn(env, 'holly@example.com');
    const preview = await start({
      env,
      request: new Request('https://claude-x.healthy-hair-grocery-planner.pages.dev/api/auth/start', {
        method: 'POST',
        body: JSON.stringify({ email: 'holly@example.com' }),
      }),
    });
    expect(await preview.json()).toEqual({ ok: true, newAccount: true });
  });

  it('signs out by clearing the cookie', async () => {
    const res = await post(signout, makeEnv(), '/api/auth/signout', {});
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});

describe('the planner lock', () => {
  const run = (path: string, env: Env, headers: Record<string, string> = {}) =>
    gate({ request: new Request(`${SITE}${path}`, { headers }), env, next: async () => new Response('planner') });

  it('stays open until sign-in is set up', async () => {
    expect(await (await run('/planner', {})).text()).toBe('planner');
  });

  it('shows the sign-in page instead of the planner, and blocks planner files', async () => {
    const env = makeEnv();
    for (const path of ['/', '/planner', '/about', '/terms', '/welcome', '/access']) {
      const res = await run(path, env);
      expect(res.status, path).toBe(200);
      expect(await res.text(), path).toContain('sign-in page');
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    }
    expect((await run('/assets/index-abc.js', env)).status).toBe(401);
    expect((await run('/meal-photos/jerk-chicken-pasta.webp', env)).status).toBe(401);
    for (const path of ['/public-assets/access-1.js', '/brand/mane-meals-phone.webp', '/api/auth/start']) {
      expect(await (await run(path, env)).text(), path).toBe('planner');
    }
  });

  it('gives the planner to someone signed in, until their account is switched off', async () => {
    const env = makeEnv();
    const Cookie = await signIn(env, 'holly@example.com');
    for (const path of ['/', '/planner', '/terms', '/assets/index-abc.js', '/meal-photos/x.webp']) {
      expect(await (await run(path, env, { Cookie })).text(), path).toBe('planner');
    }
    for (const path of ['/access', '/welcome']) {
      const res = await run(path, env, { Cookie });
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(`${SITE}/`);
    }
    (env.DB as ReturnType<typeof memoryD1>).sql.prepare('UPDATE users SET session_version = 2').run();
    expect(await (await run('/planner', env, { Cookie })).text()).toContain('sign-in page');
  });

  it('still forwards the old pages.dev address first', async () => {
    const res = await gate({
      request: new Request('https://healthy-hair-grocery-planner.pages.dev/planner'),
      env: makeEnv(),
      next: async () => new Response('planner'),
    });
    expect(res.status).toBe(301);
  });
});

describe('who is using it', () => {
  it('counts active days from /api/auth/me, and summarizes accounts without emails', async () => {
    const env = makeEnv();
    const Cookie = await signIn(env, 'buyer@example.com', CODE);
    const res = await me({ env, request: new Request(`${SITE}/api/auth/me`, { headers: { Cookie } }) });
    expect(await res.json()).toEqual({ email: 'buyer@example.com', signInEnabled: true });
    expect((await me({ env, request: new Request(`${SITE}/api/auth/me`) })).status).toBe(401);

    const db = env.DB!;
    await ensureAccountTables(db);
    const old = await createUser(db, 'live', 'early@example.com', 'guest', null, Date.parse('2026-09-01T12:00:00Z'));
    const sql = (db as ReturnType<typeof memoryD1>).sql;
    for (const day of ['2026-09-01', '2026-09-20', '2026-10-01', '2026-10-02']) {
      sql.prepare('INSERT INTO user_days (user_id, day) VALUES (?, ?)').run(old.id, day);
    }
    const today = new Date().toISOString().slice(0, 10);
    const stats = await accountStats(db, 'live', '2026-09-01', today);
    expect(stats).toMatchObject({ total: 2, bySource: { code: 1, guest: 1 }, activeToday: 1, returningInRange: 1 });
    expect(stats.cameBackAfterFirstWeek).toEqual({ accounts: 1, cameBack: 1 });
    expect(stats.byAccessCode).toHaveLength(1);
    expect(JSON.stringify(stats)).not.toContain('@');
  });
});
