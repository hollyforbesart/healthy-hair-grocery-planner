import {
  MAX_ATTEMPTS,
  countFailedAttempt,
  createUser,
  ensureAccountTables,
  findPendingSignIn,
  findUserByEmail,
  recordActiveDay,
  usePendingSignIn,
} from '../../../src/lib/accounts';
import {
  createSessionToken,
  fromOtherSite,
  hashSignInCode,
  isValidEmail,
  json,
  normalizeEmail,
  sameText,
  sessionCookie,
  signInEnabled,
} from '../../../src/lib/access';
import { environmentFor } from '../../../src/lib/analyticsSchema';
import type { PagesContext } from '../../../src/lib/cloudflareTypes';

/**
 * POST /api/auth/verify {"email": "...", "code": "123456"}
 * Checks the emailed code, creates the account if it's new, and signs this browser in.
 */
export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (fromOtherSite(request)) return json({ error: 'Not allowed.' }, 403);
  if (!signInEnabled(env)) return json({ error: 'Sign-in isn’t set up yet.' }, 503);
  const db = env.DB!;

  let body: { email?: unknown; code?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // handled below
  }
  const email = typeof body.email === 'string' ? normalizeEmail(body.email.slice(0, 300)) : '';
  const code = typeof body.code === 'string' ? body.code.replace(/\D/g, '').slice(0, 6) : '';
  if (!isValidEmail(email) || code.length !== 6) return json({ error: 'Enter the 6-digit code from the email.', reason: 'code' }, 400);

  const site = environmentFor(new URL(request.url).host);
  await ensureAccountTables(db);
  const pending = await findPendingSignIn(db, site, email);
  if (!pending || !pending.code_hash || pending.expires_at < Date.now() || pending.attempts >= MAX_ATTEMPTS) {
    return json({ error: 'That code has expired. Send yourself a new one.', reason: 'expired' }, 400);
  }
  if (!sameText(pending.code_hash, await hashSignInCode(env.SESSION_SECRET!, email, code))) {
    await countFailedAttempt(db, site, email);
    const left = MAX_ATTEMPTS - pending.attempts - 1;
    return left > 0
      ? json({ error: 'That code isn’t right. Check the latest email and try again.', reason: 'code' }, 401)
      : json({ error: 'That code isn’t right. Send yourself a new one.', reason: 'expired' }, 401);
  }
  await usePendingSignIn(db, site, email);

  let user = await findUserByEmail(db, site, email);
  const isNew = !user;
  if (!user) {
    if (!pending.new_source) return json({ error: 'There’s no Mane Meals account for this email yet.', reason: 'no-account' }, 404);
    user = await createUser(db, site, email, pending.new_source, pending.new_code_id);
  }
  if (user.disabled) return json({ error: 'This account is turned off.', reason: 'disabled' }, 403);
  await recordActiveDay(db, user.id);

  const token = await createSessionToken(env.SESSION_SECRET!, { userId: user.id, version: user.session_version });
  return json({ ok: true, email: user.email, newAccount: isNew }, 200, { 'Set-Cookie': sessionCookie(token) });
}
