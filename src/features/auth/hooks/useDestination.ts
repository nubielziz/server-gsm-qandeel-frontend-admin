// Reads the page the staff member asked for before signing in, from the `to` search parameter of the sign-in URL.
import { useSearchParams } from 'react-router';
import { DESTINATION_PARAM, safeDestination } from '../destination';
import { AUTH_PATHS } from '../paths';

/**
 * `to` is the checked `?to=` value (undefined when absent or unsafe); `destination` is where a finished sign-in
 * goes: `to`, or the home page.
 */
export function useDestination(): { to: string | undefined; destination: string } {
  const [params] = useSearchParams();
  const to = safeDestination(params.get(DESTINATION_PARAM));
  return { to, destination: to ?? AUTH_PATHS.home };
}
