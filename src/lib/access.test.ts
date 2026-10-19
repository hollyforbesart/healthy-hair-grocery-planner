import { describe, expect, it } from 'vitest';
import { onRequestPost as checkCode } from '../../functions/api/access';
import { onRequest as gate } from '../../functions/_middleware';
import {
  ACCESS_COOKIE,
  createAccessToken,
  isPublicPath,
  normalizeCode,
  parseCodes,
  readCookie,
  verifyAccessToken,
} from './access';
import type { Env } from './cloudflareTypes';

const SECRET = 'test-session-secret-0123456789';
const CODE = 'MANE-7KQ4-X9TP';
const SITE = 'https://manemeals.thehairlossnutritionist.com';

describe('access codes and tokens', () => {
  it('accepts codes however they are typed', () => {
    expect(normalizeCode(' mane-7kq4 x9tp ')).toBe('MANE7KQ4X9TP');
    expect(parseCodes('MANE-7KQ4-X9TP, second-code-22\nabc')).toEqual(['MANE7KQ4X9TP', 'SECONDCODE22']);
    expect(parseCodes(undefined)).toEqual([]);
  });

  it('verifies its own tokens, and rejects forged ones or ones from a retired code', async () => {
    const token = await createAccessToken(SECRET, CODE);
    expect(token).not.toContain('7KQ4'); // the code itself is never in the cookie
    expect(await verifyAccessToken(token, SECRET, parseCodes(CODE))).toBe(true);
    expect(await verifyAccessToken(token, 'another-secret', parseCodes(CODE))).toBe(false);
    expect(await verifyAccessToken(token.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), SECRET, parseCodes(CODE))).toBe(false);
    expect(await verifyAccessToken(token, SECRET, parseCodes('NEW-CODE-1234'))).toBe(false);
    expect(await verifyAccessToken(undefined, SECRET, parseCodes(CODE))).toBe(false);
  });

  it('reads cookies and knows which paths are public', () => {
    expect(readCookie('a=1; mm_access=v1.x.y.z; b=2', ACCESS_COOKIE)).toBe('v1.x.y.z');
    for (const p of ['/access', '/terms', '/public-assets/access-1.js', '/brand/mane-meals-phone.webp', '/favicon.png']) {
      expect(isPublicPath(p), p).toBe(true);
    }
    for (const p of ['/', '/planner', '/assets/index-1.js', '/meal-photos/jerk-chicken-pasta.webp', '/nutrients/iron.webp']) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});

describe('the access lock', () => {
  const locked: Env = {
    ACCESS_CODES: CODE,
    SESSION_SECRET: SECRET,
    ASSETS: { fetch: async () => new Response('<html>access page</html>') },
  };
  const run = (path: string, env: Env, headers: Record<string, string> = {}) =>
    gate({ request: new Request(`${SITE}${path}`, { headers }), env, next: async () => new Response('planner') });
  const withAccess = async () => ({ Cookie: `${ACCESS_COOKIE}=${await createAccessToken(SECRET, CODE)}` });

  it('stays open until the codes and secret are set', async () => {
    expect(await (await run('/planner', {})).text()).toBe('planner');
  });

  it('shows the access page instead of the planner, and blocks planner files', async () => {
    for (const path of ['/', '/planner', '/about', '/terms']) {
      const res = await run(path, locked);
      expect(res.status, path).toBe(200);
      expect(await res.text(), path).toContain('access page');
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    }
    expect((await run('/assets/index-abc.js', locked)).status).toBe(401);
    expect((await run('/meal-photos/jerk-chicken-pasta.webp', locked)).status).toBe(401);
  });

  it('lets public files and the API through without access', async () => {
    for (const path of ['/public-assets/access-1.js', '/brand/mane-meals-phone.webp', '/access', '/api/access']) {
      expect(await (await run(path, locked)).text(), path).toBe('planner');
    }
  });

  it('gives the planner to someone with access', async () => {
    const headers = await withAccess();
    for (const path of ['/', '/planner', '/terms', '/assets/index-abc.js', '/meal-photos/x.webp']) {
      expect(await (await run(path, locked, headers)).text(), path).toBe('planner');
    }
    const fromAccessPage = await run('/access', locked, headers);
    expect(fromAccessPage.status).toBe(302);
    expect(fromAccessPage.headers.get('Location')).toBe(`${SITE}/`);
  });

  it('still forwards the old pages.dev address first', async () => {
    const res = await gate({
      request: new Request('https://healthy-hair-grocery-planner.pages.dev/planner'),
      env: locked,
      next: async () => new Response('planner'),
    });
    expect(res.status).toBe(301);
  });
});

describe('POST /api/access', () => {
  const post = (body: unknown, env: Env, origin = SITE) =>
    checkCode({
      env,
      request: new Request(`${SITE}/api/access`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', Origin: origin },
      }),
    });
  const env: Env = { ACCESS_CODES: `${CODE}, OTHER-CODE-99`, SESSION_SECRET: SECRET };

  it('sets a secure, http-only access cookie for a right code', async () => {
    const res = await post({ code: 'mane 7kq4 x9tp' }, env);
    expect(res.status).toBe(200);
    const cookie = res.headers.get('Set-Cookie')!;
    expect(cookie).toMatch(/^mm_access=v1\./);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    const token = readCookie(cookie.split(';')[0], ACCESS_COOKIE);
    expect(await verifyAccessToken(token, SECRET, parseCodes(env.ACCESS_CODES))).toBe(true);
  });

  it('refuses a wrong code, and requests from other websites', async () => {
    const wrong = await post({ code: 'GUESS-1234' }, env);
    expect(wrong.status).toBe(401);
    expect(wrong.headers.get('Set-Cookie')).toBeNull();
    expect((await post({ code: CODE }, env, 'https://evil.example')).status).toBe(403);
    expect((await post('not json', env)).status).toBe(401);
  });
});
