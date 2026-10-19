import { ACCESS_COOKIE, isPublicPath, parseCodes, readCookie, verifyAccessToken } from '../src/lib/access';
import type { PagesContext } from '../src/lib/cloudflareTypes';

/** The planner's public address. */
export const CANONICAL_HOST = 'manemeals.thehairlossnutritionist.com';
/** Cloudflare's own production address, which now forwards to CANONICAL_HOST. Preview links are left alone. */
export const PAGES_DEV_HOST = 'healthy-hair-grocery-planner.pages.dev';

/** Page requests (as opposed to scripts, images and other files). */
const isPageRequest = (request: Request, pathname: string) =>
  !/\.[a-z0-9]+$/i.test(pathname) || (request.headers.get('Accept') ?? '').includes('text/html');

/**
 * Runs before every request:
 * 1. Forwards the old pages.dev address to the planner's own address.
 * 2. The access lock: once ACCESS_CODES and SESSION_SECRET are set, only browsers
 *    with a valid access cookie get the planner (pages, scripts, photos).
 *    Everyone else gets the access page, or a 401 for files. The access page,
 *    the Terms and branding stay public. /api has its own checks.
 */
export async function onRequest({ request, env, next }: PagesContext & { next: () => Promise<Response> }): Promise<Response> {
  const url = new URL(request.url);
  if (url.hostname === PAGES_DEV_HOST && !url.pathname.startsWith('/api/')) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname.startsWith('/api/')) return next();

  const codes = parseCodes(env.ACCESS_CODES);
  if (codes.length === 0 || !env.SESSION_SECRET) return next(); // lock not switched on yet

  const hasAccess = await verifyAccessToken(readCookie(request.headers.get('Cookie'), ACCESS_COOKIE), env.SESSION_SECRET, codes);
  const page = url.pathname.replace(/\/+$/, '') || '/';

  if (hasAccess) {
    // Already in: the access page has nothing to do, so go to the planner.
    return page === '/access' ? Response.redirect(new URL('/', url).toString(), 302) : next();
  }
  if (isPublicPath(url.pathname) && page !== '/terms') return next();
  if (isPageRequest(request, url.pathname) && env.ASSETS) {
    // Show the access page at the address they asked for, so a reload after entering the code lands there.
    const accessPage = await env.ASSETS.fetch(new Request(new URL('/access', url).toString(), { headers: request.headers }));
    return new Response(accessPage.body, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return new Response('Access needed', { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
