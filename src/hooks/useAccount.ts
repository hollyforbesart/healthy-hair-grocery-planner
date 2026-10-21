import { useEffect, useState } from 'react';
import { clearSyncMeta, flushPlan } from '../lib/planSync';
import { SIGN_OUT_UNSAVED_CONFIRM } from '../lib/confirmations';
import { readJson, removeKey } from '../lib/storage';
import { hasPlannerProgress, hydrateState } from '../state/plannerReducer';
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

  /**
   * Saves the latest changes to the account, signs out, then removes the plan
   * from this device (it's in the account, and the next person to use this
   * device shouldn't see it). If the latest changes couldn't be saved, they
   * choose: sign out and lose them, or stay signed in.
   */
  const signOut = async () => {
    const saved = await flushPlan();
    if (!saved && hasPlannerProgress(hydrateState(readJson(STORAGE_KEY))) && !window.confirm(SIGN_OUT_UNSAVED_CONFIRM)) return;
    const res = await fetch('/api/auth/signout', { method: 'POST' }).catch(() => null);
    if (!res?.ok) {
      window.alert('We couldn’t sign you out. Check your internet connection and try again.');
      return;
    }
    removeKey(STORAGE_KEY);
    clearSyncMeta();
    window.location.replace('/access');
  };

  return { email, signOut };
}
