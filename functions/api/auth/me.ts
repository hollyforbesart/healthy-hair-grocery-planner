import { recordActiveDay } from '../../../src/lib/accounts';
import { json, signInEnabled } from '../../../src/lib/access';
import type { PagesContext } from '../../../src/lib/cloudflareTypes';
import { currentUser } from '../../../src/lib/session';

/**
 * GET /api/auth/me — who's signed in. The planner calls it when it opens,
 * which also counts today as a day this account used the planner.
 */
export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  if (!signInEnabled(env)) return json({ email: null, signInEnabled: false });
  const user = await currentUser(request, env);
  if (!user) return json({ email: null, signInEnabled: true }, 401);
  await recordActiveDay(env.DB!, user.id);
  return json({ email: user.email, signInEnabled: true });
}
