import { ensureAccountTables, findUserById } from '../src/lib/accounts';
import { SESSION_COOKIE, isPublicPath, readCookie, readSessionToken, signInEnabled } from '../src/lib/access';
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
 * 2. Sign-in: once it's switched on (see signInEnabled), only signed-in browsers
 *    get the planner (pages, scripts, photos). Everyone else gets the sign-in
 *    page, or a 401 for files. Sign-in, the welcome page, the Terms and branding
 *    stay public. /api has its own checks.
 */
export async function onRequest({ request, env, next }: PagesContext & { next: () => Promise<Response> }): Promise<Response> {
  const url = new URL(request.url);
  if (url.hostname === PAGES_DEV_HOST && !url.pathname.startsWith('/api/')) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname.startsWith('/api/')) return next();

  if (!signInEnabled(env)) return next(); // sign-in not switched on yet

  const page = url.pathname.replace(/\/+$/, '') || '/';
  const pageRequest = isPageRequest(request, url.pathname);
  const session = await readSessionToken(readCookie(request.headers.get('Cookie'), SESSION_COOKIE), env.SESSION_SECRET!);
  let signedIn = Boolean(session);
  if (session && pageRequest) {
    // Pages also check the account still exists and is on; files only check the signature, to keep them fast.
    await ensureAccountTables(env.DB!);
    const user = await findUserById(env.DB!, session.userId);
    signedIn = Boolean(user && !user.disabled && user.session_version === session.version);
  }

  if (signedIn) {
    // Already in: the sign-in and welcome pages have nothing to do, so go to the planner.
    return page === '/access' || page === '/welcome' ? Response.redirect(new URL('/', url).toString(), 302) : next();
  }
  if (pageRequest && env.ASSETS) {
    // Every page (including /welcome and /terms) is the sign-in app, shown at the
    // address they asked for, so they land there once signed in.
    const accessPage = await env.ASSETS.fetch(new Request(new URL('/access', url).toString(), { headers: request.headers }));
    return new Response(accessPage.body, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  if (isPublicPath(url.pathname)) return next();
  return new Response('Sign-in needed', { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
