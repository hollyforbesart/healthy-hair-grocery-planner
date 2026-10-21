import { useEffect, useState } from 'react';
import { clearSyncMeta, flushPlan } from '../lib/planSync';
import { removeKey } from '../lib/storage';
import { STORAGE_KEY } from '../state/PlannerContext';

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
    // Save the latest changes to the account, then remove the plan from this device
    // (it's in the account, and the next person to use this device shouldn't see it).
    // If it couldn't be saved (e.g. offline), keep it here rather than lose it.
    if (await flushPlan()) {
      removeKey(STORAGE_KEY);
      clearSyncMeta();
    }
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
    window.location.replace('/access');
  };

  return { email, signOut };
}
