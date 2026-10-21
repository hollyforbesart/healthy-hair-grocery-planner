import { findPlan, savePlan } from '../../src/lib/accounts';
import { fromOtherSite, json, signInEnabled } from '../../src/lib/access';
import type { PagesContext } from '../../src/lib/cloudflareTypes';
import { currentUser } from '../../src/lib/session';

/** Plans are small (a week of meals, a list, a schedule); this is far above any real one. */
export const MAX_PLAN_BYTES = 200_000;

/**
 * GET /api/plan — the signed-in account's saved plan: {email, plan, modifiedAt},
 * with plan null if nothing is saved yet.
 */
export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  if (!signInEnabled(env)) return json({ enabled: false }, 404);
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Sign in to load your plan.' }, 401);
  const saved = await findPlan(env.DB!, user.id);
  return json({ email: user.email, plan: saved ? JSON.parse(saved.data) : null, modifiedAt: saved?.modified_at ?? 0 });
}

/**
 * PUT /api/plan {plan, modifiedAt} — saves the plan, unless another device
 * changed it more recently: then 409 with the newer plan, for this device to use.
 */
export async function onRequestPut({ request, env }: PagesContext): Promise<Response> {
  if (fromOtherSite(request)) return json({ error: 'Not allowed.' }, 403);
  if (!signInEnabled(env)) return json({ enabled: false }, 404);
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Sign in to save your plan.' }, 401);

  const text = await request.text();
  if (text.length > MAX_PLAN_BYTES) return json({ error: 'Plan is too large.' }, 413);
  let body: { plan?: unknown; modifiedAt?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return json({ error: 'Not a plan.' }, 400);
  }
  const modifiedAt = typeof body.modifiedAt === 'number' && Number.isFinite(body.modifiedAt) ? Math.floor(body.modifiedAt) : NaN;
  if (typeof body.plan !== 'object' || body.plan === null || Number.isNaN(modifiedAt)) return json({ error: 'Not a plan.' }, 400);
  // A device clock far in the future would otherwise win every time.
  const stamp = Math.min(modifiedAt, Date.now() + 60_000);

  const result = await savePlan(env.DB!, user.id, JSON.stringify(body.plan), stamp);
  if (!result.saved) return json({ plan: JSON.parse(result.newer.data), modifiedAt: result.newer.modified_at }, 409);
  return json({ ok: true, modifiedAt: stamp });
}
