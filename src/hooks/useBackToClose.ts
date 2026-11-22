import { useCallback, useEffect } from 'react';

/**
 * While a panel is open, adds a browser history entry so the phone's back
 * gesture (or the browser's back button) closes the panel instead of leaving
 * the page. Returns the function to close it from a button.
 */
export function useBackToClose(onClose: () => void): () => void {
  useEffect(() => {
    if (!(window.history.state as { sheet?: boolean } | null)?.sheet) {
      window.history.pushState({ ...(window.history.state ?? {}), sheet: true }, '');
    }
    window.addEventListener('popstate', onClose);
    return () => window.removeEventListener('popstate', onClose);
  }, [onClose]);
  return useCallback(() => window.history.back(), []);
}
