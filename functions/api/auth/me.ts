import { ensureAccountTables, findUserById, recordActiveDay } from '../../../src/lib/accounts';
import { SESSION_COOKIE, json, readCookie, readSessionToken, signInEnabled } from '../../../src/lib/access';
import type { PagesContext } from '../../../src/lib/cloudflareTypes';

/**
 * GET /api/auth/me — who's signed in. The planner calls it when it opens,
 * which also counts today as a day this account used the planner.
 */
export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  if (!signInEnabled(env)) return json({ email: null, signInEnabled: false });
  const session = await readSessionToken(readCookie(request.headers.get('Cookie'), SESSION_COOKIE), env.SESSION_SECRET!);
  if (!session) return json({ email: null, signInEnabled: true }, 401);
  await ensureAccountTables(env.DB!);
  const user = await findUserById(env.DB!, session.userId);
  if (!user || user.disabled || user.session_version !== session.version) return json({ email: null, signInEnabled: true }, 401);
  await recordActiveDay(env.DB!, user.id);
  return json({ email: user.email, signInEnabled: true });
}
