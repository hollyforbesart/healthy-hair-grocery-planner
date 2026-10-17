import { isRunningInstalled } from '../hooks/useInstallPrompt';
import type { EventName } from './analyticsSchema';

const ENDPOINT = '/api/event';

/** Off during development and tests, and for visitors whose browser asks not to be tracked. */
function enabled(): boolean {
  if (import.meta.env.DEV || import.meta.env.MODE === 'test' || typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !(nav.globalPrivacyControl || nav.doNotTrack === '1');
}

/**
 * Sends one anonymous usage event (see analyticsSchema.ts). Fire-and-forget:
 * it never blocks the planner, and failures (offline, not set up) are ignored.
 */
export function track(name: EventName, value?: string | number): void {
  if (!enabled()) return;
  try {
    const body = JSON.stringify({ name, value, installed: isRunningInstalled() });
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(
      () => {},
    );
  } catch {
    // Analytics must never break the planner.
  }
}
