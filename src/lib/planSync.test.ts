import { describe, expect, it } from 'vitest';
import { onRequestGet as getPlan, onRequestPut as putPlan } from '../../functions/api/plan';
import { memoryD1 } from '../test/memoryD1';
import { createSessionToken, SESSION_COOKIE } from './access';
import { createUser, ensureAccountTables } from './accounts';
import type { Env } from './cloudflareTypes';
import { decideSync } from './planSync';

describe('which plan wins when the planner opens', () => {
  const account = (hasPlan: boolean, modifiedAt = 0) => ({ email: 'a@x.com', hasPlan, modifiedAt });

  it('uploads a plan made before accounts, and uses the account’s plan on a new device', () => {
    expect(decideSync({ owner: null, modifiedAt: 0, hasProgress: true }, account(false))).toBe('upload');
    expect(decideSync({ owner: null, modifiedAt: 0, hasProgress: false }, account(true, 500))).toBe('use-account');
    expect(decideSync({ owner: null, modifiedAt: 0, hasProgress: false }, account(false))).toBe('nothing');
  });

  it('keeps whichever was changed most recently', () => {
    expect(decideSync({ owner: 'a@x.com', modifiedAt: 900, hasProgress: true }, account(true, 500))).toBe('upload');
    expect(decideSync({ owner: 'a@x.com', modifiedAt: 300, hasProgress: true }, account(true, 500))).toBe('use-account');
    expect(decideSync({ owner: 'a@x.com', modifiedAt: 500, hasProgress: true }, account(true, 500))).toBe('nothing');
  });

  it('never mixes in a plan from someone else’s account on a shared device', () => {
    expect(decideSync({ owner: 'b@x.com', modifiedAt: 999, hasProgress: true }, account(true, 1))).toBe('use-account');
    expect(decideSync({ owner: 'b@x.com', modifiedAt: 999, hasProgress: true }, account(false))).toBe('start-fresh');
  });
});

describe('/api/plan', () => {
  const SITE = 'https://manemeals.thehairlossnutritionist.com';
  const SECRET = 'test-session-secret-0123456789';

  async function setup() {
    const env: Env = { DB: memoryD1(), SESSION_SECRET: SECRET, GUEST_EMAILS: 'holly@example.com' };
    await ensureAccountTables(env.DB!);
    const user = await createUser(env.DB!, 'live', 'holly@example.com', 'guest', null);
    const Cookie = `${SESSION_COOKIE}=${await createSessionToken(SECRET, { userId: user.id, version: user.session_version })}`;
    const get = (headers: Record<string, string> = { Cookie }) => getPlan({ env, request: new Request(`${SITE}/api/plan`, { headers }) });
    const put = (body: unknown, headers: Record<string, string> = { Cookie, Origin: SITE }) =>
      putPlan({ env, request: new Request(`${SITE}/api/plan`, { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body), headers }) });
    return { get, put };
  }

  it('saves and loads the signed-in account’s plan', async () => {
    const { get, put } = await setup();
    expect(await (await get()).json()).toEqual({ email: 'holly@example.com', plan: null, modifiedAt: 0 });
    const saved = await put({ plan: { version: 1, selectedMealIds: ['a'] }, modifiedAt: 1000 });
    expect(saved.status).toBe(200);
    expect(await (await get()).json()).toEqual({ email: 'holly@example.com', plan: { version: 1, selectedMealIds: ['a'] }, modifiedAt: 1000 });
  });

  it('keeps the more recently changed plan and hands it back to the older device', async () => {
    const { get, put } = await setup();
    await put({ plan: { from: 'phone' }, modifiedAt: 2000 });
    const older = await put({ plan: { from: 'laptop' }, modifiedAt: 1500 });
    expect(older.status).toBe(409);
    expect(await older.json()).toEqual({ plan: { from: 'phone' }, modifiedAt: 2000 });
    expect((await (await get()).json()).plan).toEqual({ from: 'phone' });
  });

  it('refuses people who aren’t signed in, other websites, and junk', async () => {
    const { get, put } = await setup();
    expect((await get({})).status).toBe(401);
    expect((await put({ plan: {}, modifiedAt: 1 }, { Origin: SITE })).status).toBe(401);
    expect((await put({ plan: {}, modifiedAt: 1 }, { Origin: 'https://evil.example' })).status).toBe(403);
    expect((await put('not json')).status).toBe(400);
    expect((await put({ plan: 'x', modifiedAt: 1 })).status).toBe(400);
    expect((await put({ plan: { big: 'x'.repeat(250_000) }, modifiedAt: 1 })).status).toBe(413);
  });
});

describe('deleting an account', () => {
  it('removes the account, saved plan, days used and sign-in codes, on live and preview, with the dashboard key only', async () => {
    const { onRequestPost: del } = await import('../../functions/api/admin/delete-account');
    const { recordActiveDay, savePendingSignIn, savePlan } = await import('./accounts');
    const db = memoryD1();
    const env: Env = { DB: db, STATS_KEY: 'dashboard-key-123' };
    await ensureAccountTables(db);
    const live = await createUser(db, 'live', 'gone@example.com', 'code', 'abc');
    const preview = await createUser(db, 'preview', 'gone@example.com', 'guest', null);
    const keep = await createUser(db, 'live', 'stay@example.com', 'guest', null);
    for (const u of [live, preview, keep]) {
      await savePlan(db, u.id, '{"selectedMealIds":["a"]}', 1);
      await recordActiveDay(db, u.id);
    }
    await savePendingSignIn(db, 'live', 'gone@example.com', 'hash', null);

    const call = (email: string, key = 'dashboard-key-123') =>
      del({ env, request: new Request('https://x/api/admin/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify({ email }) }) });

    expect((await call('gone@example.com', 'wrong')).status).toBe(401);
    expect(await (await call(' Gone@Example.com ')).json()).toEqual({ email: 'gone@example.com', deleted: 2 });
    const count = (sql: string) => (db.sql.prepare(sql).get() as { n: number }).n;
    expect(count("SELECT COUNT(*) AS n FROM users WHERE email = 'gone@example.com'")).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM plans WHERE user_id IN (${live.id}, ${preview.id})`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM user_days WHERE user_id IN (${live.id}, ${preview.id})`)).toBe(0);
    expect(count("SELECT COUNT(*) AS n FROM sign_in_codes WHERE email = 'gone@example.com'")).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM plans WHERE user_id = ${keep.id}`)).toBe(1); // someone else is untouched
    expect(await (await call('gone@example.com')).json()).toEqual({ email: 'gone@example.com', deleted: 0 });
    expect((await call('not an email')).status).toBe(400);
  });
});
