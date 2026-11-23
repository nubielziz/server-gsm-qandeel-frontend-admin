// LegacyRedirect: sends an old address (`/services`, `/storefront?tab=publish`) to its new place before the page's permission gate runs,
// so a role that may open the new page is never refused at the old one. The entry is replaced; the query and the hash are carried.
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { legacyTarget } from '../legacyRedirects';

/** Redirects when the address is an old one (`legacyTarget`); otherwise shows `children` (the page, or the not-found page). */
export function LegacyRedirect({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const target = legacyTarget(pathname, search);
  return target ? <Navigate to={`${target}${hash}`} replace /> : <>{children}</>;
}
