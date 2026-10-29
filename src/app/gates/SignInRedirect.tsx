// SignInRedirect: sends a signed-out visitor of a protected address to the sign-in screen, remembering the address.
import { useIsAuthenticated } from '@refinedev/core';
import { Navigate, useLocation } from 'react-router';
import { AUTH_PATHS, safeDestination, withDestination } from '@/features/auth';

/**
 * The target is the `redirectTo` of the auth provider's `check` (`/login`, or `/login?reason=suspended` / `ip` when
 * the account is blocked), with the wanted address added as `?to=`. Refine's own redirect in `<Authenticated>` is not
 * used because it appends `?to=` to a path that already has a query, giving `/login?reason=ip?to=…`.
 */
export function SignInRedirect() {
  // The same cached query `<Authenticated>` has just answered, so no new request.
  const { data } = useIsAuthenticated();
  const { pathname, search } = useLocation();
  const wanted = `${pathname}${search}`;
  // The root and the home page need no memory: they are where a plain sign-in ends anyway.
  const destination = wanted === '/' || wanted === AUTH_PATHS.home ? undefined : safeDestination(wanted);
  return <Navigate to={withDestination(data?.redirectTo ?? AUTH_PATHS.login, destination)} replace />;
}
