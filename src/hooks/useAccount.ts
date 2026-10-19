import { useEffect, useState } from 'react';

/**
 * The signed-in account's email, from /api/auth/me (null before sign-in is
 * switched on, offline, or in development). Asking also counts today as a
 * day this account used the planner.
 */
export function useAccount(): { email: string | null; signOut: () => Promise<void> } {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') return;
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json() as Promise<{ email?: string | null }>)
      .then((data) => {
        if (!cancelled) setEmail(data.email ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
    window.location.replace('/access');
  };

  return { email, signOut };
}
