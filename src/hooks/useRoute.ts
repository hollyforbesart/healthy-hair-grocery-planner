import { useCallback, useEffect, useState } from 'react';

/** The app's pages. Any unknown path shows the home page. */
export type Route = 'home' | 'planner' | 'week' | 'about' | 'nutrients' | 'terms';

export const ROUTE_PATHS: Record<Route, string> = {
  home: '/',
  planner: '/planner',
  week: '/schedule',
  about: '/about',
  nutrients: '/nutrients',
  terms: '/terms',
};

/** Old addresses that still work. */
const ALIASES: Record<string, Route> = { '/week': 'week' };

const routeFromPath = (path: string): Route => {
  const clean = path.replace(/\/+$/, '') || '/';
  if (ALIASES[clean]) return ALIASES[clean];
  const match = (Object.keys(ROUTE_PATHS) as Route[]).find((r) => ROUTE_PATHS[r] === clean);
  return match ?? 'home';
};

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

/**
 * Goes to a page from anywhere (e.g. inside a planner step, which doesn't get
 * `navigate`): updates the address, and useRoute picks it up.
 */
export function goToRoute(route: Route): void {
  window.history.pushState(null, '', ROUTE_PATHS[route]);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}
