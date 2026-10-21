import { deleteAccount } from '../../../src/lib/accounts';
import { isValidEmail, json, normalizeEmail, sameText } from '../../../src/lib/access';
import type { PagesContext } from '../../../src/lib/cloudflareTypes';

/**
 * POST /api/admin/delete-account {"email": "..."} with "Authorization: Bearer <STATS_KEY>".
 * For Holly: deletes a person's Mane Meals account and saved plan when they ask.
 */
export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (!env.DB || !env.STATS_KEY) return json({ error: 'Not set up.' }, 503);
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!sameText(given, env.STATS_KEY)) return json({ error: 'Wrong or missing key.' }, 401);

  let body: { email?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // handled below
  }
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  if (!isValidEmail(email)) return json({ error: 'Enter a valid email address.' }, 400);

  const deleted = await deleteAccount(env.DB, email);
  return json({ email, deleted });
}
