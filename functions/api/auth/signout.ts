import { clearedSessionCookie, fromOtherSite, json } from '../../../src/lib/access';
import type { PagesContext } from '../../../src/lib/cloudflareTypes';

/** POST /api/auth/signout — signs this browser out. */
export async function onRequestPost({ request }: PagesContext): Promise<Response> {
  if (fromOtherSite(request)) return json({ error: 'Not allowed.' }, 403);
  return json({ ok: true }, 200, { 'Set-Cookie': clearedSessionCookie() });
}
