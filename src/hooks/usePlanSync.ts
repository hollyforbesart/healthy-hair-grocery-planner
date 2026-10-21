import { useEffect, useRef } from 'react';
import { decideSync, readSyncMeta, registerPlanFlush, writeSyncMeta } from '../lib/planSync';
import { createInitialState, hasPlannerProgress, hydrateState, type PlannerState } from '../state/plannerReducer';

const SAVE_DELAY_MS = 1500;

/**
 * Keeps the plan saved to the signed-in account (see lib/planSync.ts).
 * `replace` swaps in a plan from the account without counting it as a new change.
 */
export function usePlanSync(state: PlannerState, replace: (state: PlannerState) => void): void {
  const enabled = !import.meta.env.DEV && import.meta.env.MODE !== 'test';
  const latest = useRef(state);
  latest.current = state;
  const active = useRef(false); // true once we know someone is signed in
  const email = useRef<string | null>(null);
  const applyingRemote = useRef(false);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const firstRender = useRef(true);

  /** Saves to the account; true when nothing is left unsaved. */
  const push = async (keepalive = false): Promise<boolean> => {
    if (!active.current) return false;
    if (!dirty.current) return true;
    window.clearTimeout(timer.current);
    const { modifiedAt } = readSyncMeta();
    dirty.current = false;
    try {
      const res = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: latest.current, modifiedAt }),
        keepalive,
      });
      if (res.status === 409) {
        // Another device changed the plan more recently: use that one.
        const newer = (await res.json()) as { plan: unknown; modifiedAt: number };
        applyingRemote.current = true;
        replace(hydrateState(newer.plan));
        writeSyncMeta({ owner: email.current, modifiedAt: newer.modifiedAt });
        return true;
      }
      if (res.status === 401 || res.status === 404) active.current = false;
      if (!res.ok) dirty.current = true;
      return res.ok;
    } catch {
      dirty.current = true; // offline: try again on the next change or when back online
      return false;
    }
  };

  const pull = async () => {
    try {
      const res = await fetch('/api/plan', { cache: 'no-store' });
      if (!res.ok) {
        active.current = false;
        return;
      }
      const account = (await res.json()) as { email: string; plan: unknown; modifiedAt: number };
      active.current = true;
      email.current = account.email;
      const meta = readSyncMeta();
      const decision = decideSync(
        { owner: meta.owner, modifiedAt: meta.modifiedAt, hasProgress: hasPlannerProgress(latest.current) },
        { email: account.email, hasPlan: account.plan !== null, modifiedAt: account.modifiedAt },
      );
      if (decision === 'use-account' || decision === 'start-fresh') {
        applyingRemote.current = true;
        replace(decision === 'use-account' ? hydrateState(account.plan) : createInitialState());
        writeSyncMeta({ owner: account.email, modifiedAt: decision === 'use-account' ? account.modifiedAt : 0 });
      } else {
        writeSyncMeta({ owner: account.email, modifiedAt: meta.modifiedAt || Date.now() });
        if (decision === 'upload' || dirty.current) {
          dirty.current = true;
          await push();
        }
      }
    } catch {
      // Offline: the browser copy keeps working; we'll catch up later.
    }
  };

  // Load the account's plan when the planner opens, and again when the person comes back to it.
  useEffect(() => {
    if (!enabled) return;
    void pull();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pull();
      else void push(true);
    };
    const onOnline = () => void pull();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    const onHide = () => void push(true);
    window.addEventListener('pagehide', onHide);
    registerPlanFlush(() => push());
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pagehide', onHide);
      registerPlanFlush(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every change made on this device: note when, and save it shortly after.
  useEffect(() => {
    if (!enabled) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    const meta = readSyncMeta();
    writeSyncMeta({ owner: meta.owner ?? email.current, modifiedAt: Date.now() });
    dirty.current = true;
    if (!active.current) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void push(), SAVE_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
