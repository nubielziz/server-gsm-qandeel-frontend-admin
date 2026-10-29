// The page a staff member asked for before signing in. It travels through the sign-in steps in the `to` search
// parameter (`/login?to=%2Forders`), the same name Refine's own redirects use.
import { AUTH_PATHS } from './paths';

export const DESTINATION_PARAM = 'to';

// Every screen of the sign-in flow: coming back to one of them after signing in would only bounce the user again.
const SIGN_IN_SCREENS: readonly string[] = [
  AUTH_PATHS.login,
  AUTH_PATHS.twoFactor,
  AUTH_PATHS.setupTwoFactor,
  AUTH_PATHS.setPassword,
];

// Browsers drop tabs and line breaks inside a URL, so "/<tab>/host" would turn into "//host".
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) < 0x20) return true;
  }
  return false;
}

/**
 * The destination when it is safe to navigate to, otherwise undefined. A link can carry any `to`, so only a path
 * inside the console passes: one slash at the start, no `//host`, no backslash, no control characters, and not a
 * sign-in screen. This stops a crafted sign-in link from sending the user to another site.
 */
export function safeDestination(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return undefined;
  if (value.includes('\\') || hasControlCharacter(value)) return undefined;
  const pathname = value.split(/[?#]/)[0];
  return SIGN_IN_SCREENS.includes(pathname) ? undefined : value;
}

/**
 * Adds the destination to a path for the next step, keeping that path's own query:
 * `withDestination('/login?reason=ip', '/orders?tab=review')` is `/login?reason=ip&to=%2Forders%3Ftab%3Dreview`.
 * Without a destination the path comes back unchanged.
 */
export function withDestination(path: string, destination: string | undefined): string {
  if (!destination) return path;
  // Only the path and query are used from the helper URL; its host is a placeholder.
  const url = new URL(path, 'http://console.invalid');
  url.searchParams.set(DESTINATION_PARAM, destination);
  return `${url.pathname}${url.search}${url.hash}`;
}
