/**
 * Saving plans to the account, so they follow people between devices (and
 * survive Safari clearing a site's data). The browser copy stays the working
 * copy, so the planner works offline; it's sent to the account a moment
 * after each change, and the account's copy is loaded when the planner opens.
 * When two devices disagree, the most recently changed plan wins.
 */
import { readJson, removeKey, writeJson } from './storage';

export const SYNC_KEY = 'mane-meals-plan-sync';

export interface SyncMeta {
  /** The account this browser's plan belongs to (null before the first sync). */
  owner: string | null;
  /** When this browser's plan last changed (ms). */
  modifiedAt: number;
}

export const readSyncMeta = (): SyncMeta => {
  const saved = readJson(SYNC_KEY) as Partial<SyncMeta> | null;
  return {
    owner: typeof saved?.owner === 'string' ? saved.owner : null,
    modifiedAt: typeof saved?.modifiedAt === 'number' ? saved.modifiedAt : 0,
  };
};
export const writeSyncMeta = (meta: SyncMeta) => writeJson(SYNC_KEY, meta);
export const clearSyncMeta = () => removeKey(SYNC_KEY);

export type SyncDecision = 'use-account' | 'upload' | 'start-fresh' | 'nothing';

/**
 * What to do when the planner opens, given this browser's plan and the account's.
 * - A plan from a different account on this browser never mixes in: use the
 *   account's plan, or start fresh if it has none.
 * - Otherwise the more recently changed plan wins.
 */
export function decideSync(
  local: { owner: string | null; modifiedAt: number; hasProgress: boolean },
  account: { email: string; hasPlan: boolean; modifiedAt: number },
): SyncDecision {
  if (local.owner && local.owner !== account.email) return account.hasPlan ? 'use-account' : 'start-fresh';
  if (account.hasPlan && account.modifiedAt > local.modifiedAt) return 'use-account';
  if (local.hasProgress && (!account.hasPlan || local.modifiedAt > account.modifiedAt)) return 'upload';
  return 'nothing';
}

/** Set by the planner while it's open, so signing out can save the latest changes first. */
let flushPending: (() => Promise<boolean>) | null = null;
export const registerPlanFlush = (fn: (() => Promise<boolean>) | null) => {
  flushPending = fn;
};
/** Saves any unsaved changes now; true if the account has the latest plan. */
export const flushPlan = () => (flushPending ? flushPending() : Promise.resolve(false));
