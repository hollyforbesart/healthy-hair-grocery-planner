import { RANKED_EVENTS, buildStats, type CountRow, type DailyRow, type DeviceRow, type ValueRow } from '../../src/lib/analyticsStats';
import type { PagesContext } from '../../src/lib/cloudflareTypes';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });

/** Compares without leaking how much of the key matched. */
function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

/**
 * GET /api/stats?days=30&env=live — summary of usage for a dashboard.
 * Needs the STATS_KEY secret, as "Authorization: Bearer <key>" or ?key=<key>.
 */
export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  if (!env.DB || !env.STATS_KEY) return json({ error: 'Analytics is not set up yet. See docs/ANALYTICS.md.' }, 503);

  const url = new URL(request.url);
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '') || url.searchParams.get('key') || '';
  if (!sameKey(given, env.STATS_KEY)) return json({ error: 'Wrong or missing key.' }, 401);

  const days = Math.min(Math.max(Number.parseInt(url.searchParams.get('days') ?? '30', 10) || 30, 1), 365);
  const environment = ['live', 'preview', 'dev'].includes(url.searchParams.get('env') ?? '') ? url.searchParams.get('env')! : 'live';
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const where = 'WHERE env = ? AND day >= ?';
  const q = <T,>(sql: string, ...extra: unknown[]) =>
    env.DB!.prepare(sql).bind(environment, from, ...extra).all<T>().then((r) => r.results);

  const placeholders = RANKED_EVENTS.map(() => '?').join(', ');
  const [totals, daily, values, pages, steps, devices] = await Promise.all([
    q<CountRow>(`SELECT name, COUNT(*) AS count FROM events ${where} GROUP BY name`),
    q<DailyRow>(`SELECT day, name, COUNT(*) AS count FROM events ${where} GROUP BY day, name`),
    q<ValueRow>(
      `SELECT name, value, COUNT(*) AS count FROM events ${where} AND value IS NOT NULL AND name IN (${placeholders}) GROUP BY name, value`,
      ...RANKED_EVENTS,
    ),
    q<ValueRow>(`SELECT name, value, COUNT(*) AS count FROM events ${where} AND name = 'page_view' GROUP BY value`),
    q<ValueRow>(`SELECT name, value, COUNT(*) AS count FROM events ${where} AND name = 'step_view' GROUP BY value`),
    q<DeviceRow>(`SELECT device, COUNT(*) AS count FROM events ${where} AND name = 'page_view' GROUP BY device`),
  ]);

  return json(
    buildStats({ env: environment, days, from, to: to.toISOString().slice(0, 10) }, totals, daily, values, pages, steps, devices),
  );
}
