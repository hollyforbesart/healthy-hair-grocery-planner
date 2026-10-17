import type { PagesContext } from '../src/lib/cloudflareTypes';

/** The planner's public address. */
export const CANONICAL_HOST = 'manemeals.thehairlossnutritionist.com';
/** Cloudflare's own production address, which now forwards to CANONICAL_HOST. Preview links are left alone. */
export const PAGES_DEV_HOST = 'healthy-hair-grocery-planner.pages.dev';

/**
 * Sends visitors on the old pages.dev address to the planner's own address,
 * keeping the page they asked for, so everyone uses one address (saved plans
 * belong to the exact address they were made on). /api calls pass through.
 */
export async function onRequest({ request, next }: PagesContext & { next: () => Promise<Response> }): Promise<Response> {
  const url = new URL(request.url);
  if (url.hostname === PAGES_DEV_HOST && !url.pathname.startsWith('/api/')) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
