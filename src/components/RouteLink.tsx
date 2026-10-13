import type { ReactNode } from 'react';
import { ROUTE_PATHS, type Route } from '../hooks/useRoute';

/** A real link (works with open-in-new-tab) that navigates in-app on a normal click. */
export function RouteLink({
  to,
  navigate,
  className,
  children,
}: {
  to: Route;
  navigate: (route: Route) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={ROUTE_PATHS[to]}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
