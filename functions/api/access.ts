import { accessCookie, createAccessToken, normalizeCode, parseCodes } from '../../src/lib/access';
import type { PagesContext } from '../../src/lib/cloudflareTypes';

const json = (data: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

/** POST /api/access {"code": "..."} — checks an access code and, if it's right, gives this browser access. */
export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== url.host) return json({ error: 'Not allowed.' }, 403);

  const codes = parseCodes(env.ACCESS_CODES);
  if (codes.length === 0 || !env.SESSION_SECRET) return json({ ok: true }, 200); // lock not switched on

  let code = '';
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === 'string' ? normalizeCode(body.code.slice(0, 100)) : '';
  } catch {
    // treated as a wrong code below
  }

  if (!code || !codes.includes(code)) {
    // A short pause makes guessing codes impractical.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return json({ error: 'That code didn’t work. Check it against your purchase email and try again.' }, 401);
  }
  const token = await createAccessToken(env.SESSION_SECRET, code);
  return json({ ok: true }, 200, { 'Set-Cookie': accessCookie(token) });
}
