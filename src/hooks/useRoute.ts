import { useCallback, useEffect, useState } from 'react';

/** The app's two pages. Anything other than /planner shows the home page. */
export type Route = 'home' | 'planner';

export const ROUTE_PATHS: Record<Route, string> = { home: '/', planner: '/planner' };

const routeFromPath = (path: string): Route => (path.replace(/\/+$/, '') === '/planner' ? 'planner' : 'home');

/**
 * Minimal path-based routing (no library). Cloudflare Pages serves index.html
 * for unknown paths, so /planner can be linked directly, e.g. from an email.
 */
export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: Route) => {
    if (routeFromPath(window.location.pathname) !== next) window.history.pushState(null, '', ROUTE_PATHS[next]);
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  return [route, navigate];
}
