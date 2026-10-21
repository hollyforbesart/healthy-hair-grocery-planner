import { ensureAccountTables, findUserById, type User } from './accounts';
import { SESSION_COOKIE, readCookie, readSessionToken, signInEnabled } from './access';
import type { Env } from './cloudflareTypes';

/** The signed-in account for a request, or null (signed out, switched off, or sign-in not set up). */
export async function currentUser(request: Request, env: Env): Promise<User | null> {
  if (!signInEnabled(env)) return null;
  const session = await readSessionToken(readCookie(request.headers.get('Cookie'), SESSION_COOKIE), env.SESSION_SECRET!);
  if (!session) return null;
  await ensureAccountTables(env.DB!);
  const user = await findUserById(env.DB!, session.userId);
  return user && !user.disabled && user.session_version === session.version ? user : null;
}
