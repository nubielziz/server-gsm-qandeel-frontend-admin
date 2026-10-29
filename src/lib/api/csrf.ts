// CSRF token lookup for mutating requests (decision 006): the readable cookie first, then the last
// `X-CSRF-Token` response header the server sent. Whether the token is also checked server-side is not our call.
import { csrfCookieName } from './config';

let remembered: string | undefined;

/** Value of a cookie from `document.cookie`, or undefined (also outside a browser). */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(value) || undefined;
    } catch {
      return value || undefined;
    }
  }
  return undefined;
}

/** The token to send as `X-CSRF-Token`, or `undefined` when the server has not given us one yet. */
export function getCsrfToken(): string | undefined {
  return readCookie(csrfCookieName()) ?? remembered;
}

/** Keeps the token from a response header, for backends whose cookie we cannot read (cross-site API). */
export function rememberCsrfToken(res: Response): void {
  const token = res.headers.get('X-CSRF-Token');
  if (token) remembered = token;
}

/** Forgets the remembered header token (sign-out, tests). */
export function forgetCsrfToken(): void {
  remembered = undefined;
}
