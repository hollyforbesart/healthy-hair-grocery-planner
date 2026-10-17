import { deviceFor, environmentFor, parseEvent } from '../../src/lib/analyticsSchema';
import type { PagesContext } from '../../src/lib/cloudflareTypes';

const noContent = () => new Response(null, { status: 204 });

/**
 * POST /api/event — stores one anonymous usage event from the planner.
 * Only known event names and short values are kept. No IP address, cookie,
 * user agent or visitor ID is stored.
 */
export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (!env.DB) return noContent(); // analytics not set up yet: accept and ignore

  // Only the planner itself may send events.
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== url.host) return new Response(null, { status: 403 });

  const text = await request.text();
  if (text.length > 500) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const event = parseEvent(body);
  if (!event) return new Response(null, { status: 400 });

  const installed = typeof body === 'object' && body !== null && (body as { installed?: unknown }).installed === true;
  const ts = new Date().toISOString();
  await env.DB.prepare('INSERT INTO events (ts, day, env, name, value, device) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(
      ts,
      ts.slice(0, 10),
      environmentFor(url.host),
      event.name,
      event.value ?? null,
      deviceFor(request.headers.get('User-Agent') ?? '', installed),
    )
    .run();
  return noContent();
}
