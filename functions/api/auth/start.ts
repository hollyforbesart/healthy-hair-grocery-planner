import { ensureAccountTables, findUserByEmail, savePendingSignIn, type AccountSource } from '../../../src/lib/accounts';
import {
  codeId,
  createSignInCode,
  fromOtherSite,
  hashSignInCode,
  isValidEmail,
  json,
  normalizeCode,
  normalizeEmail,
  parseCodes,
  parseEmails,
  signInEnabled,
} from '../../../src/lib/access';
import { environmentFor } from '../../../src/lib/analyticsSchema';
import type { PagesContext } from '../../../src/lib/cloudflareTypes';
import { isKitBuyer, sendSignInCode } from '../../../src/lib/signInServices';

/** A short pause on a wrong access code makes guessing impractical. */
const pause = () => new Promise((resolve) => setTimeout(resolve, 600));

/**
 * POST /api/auth/start {"email": "...", "code"?: "access code"}
 * Emails a 6-digit sign-in code to an existing account, or to a new buyer
 * (with a valid access code, on the guest list, or tagged as a buyer in Kit).
 */
export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (fromOtherSite(request)) return json({ error: 'Not allowed.' }, 403);
  if (!signInEnabled(env) || !env.RESEND_API_KEY) return json({ error: 'Sign-in isn’t set up yet.' }, 503);
  const db = env.DB!;

  let body: { email?: unknown; code?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // handled as a missing email below
  }
  const email = typeof body.email === 'string' ? normalizeEmail(body.email.slice(0, 300)) : '';
  const accessCode = typeof body.code === 'string' ? normalizeCode(body.code.slice(0, 100)) : '';
  if (!isValidEmail(email)) return json({ error: 'Enter a valid email address.', reason: 'email' }, 400);

  const site = environmentFor(new URL(request.url).host);
  await ensureAccountTables(db);
  const user = await findUserByEmail(db, site, email);
  if (user?.disabled) return json({ error: 'This account is turned off.', reason: 'disabled' }, 403);

  let newAccount: { source: AccountSource; codeId: string | null } | null = null;
  if (!user) {
    if (parseEmails(env.GUEST_EMAILS).includes(email)) {
      newAccount = { source: 'guest', codeId: null };
    } else if (accessCode && parseCodes(env.ACCESS_CODES).includes(accessCode)) {
      newAccount = { source: 'code', codeId: await codeId(accessCode) };
    } else if (await isKitBuyer(env, email)) {
      newAccount = { source: 'kit', codeId: null };
    } else if (accessCode) {
      await pause();
      return json({ error: 'That access code didn’t work.', reason: 'code' }, 401);
    } else {
      return json({ error: 'There’s no Mane Meals account for this email yet.', reason: 'no-account' }, 404);
    }
  }

  const code = createSignInCode();
  const saved = await savePendingSignIn(db, site, email, await hashSignInCode(env.SESSION_SECRET!, email, code), newAccount);
  if (!saved) return json({ error: 'Too many codes requested. Please wait an hour and try again.', reason: 'limit' }, 429);
  if (!(await sendSignInCode(env, email, code, Boolean(newAccount)))) {
    return json({ error: 'We couldn’t send the email just now. Please try again in a minute.', reason: 'send' }, 502);
  }
  return json({ ok: true, newAccount: Boolean(newAccount) });
}
