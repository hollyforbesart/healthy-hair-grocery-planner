export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'failed';

/** Open the device's share sheet (Notes, Messages, email…) where supported. */
export async function shareText(title: string, text: string): Promise<ShareOutcome> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'unsupported';
  try {
    await navigator.share({ title, text });
    return 'shared';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
