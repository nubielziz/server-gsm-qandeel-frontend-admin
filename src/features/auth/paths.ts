// Screen paths of the sign-in flow. The auth provider redirects to them and the sign-in pages are mounted on them.

export const AUTH_PATHS = {
  login: '/login',
  twoFactor: '/login/2fa',
  setupTwoFactor: '/login/setup-2fa',
  setPassword: '/set-password',
  /** Where a finished sign-in lands: the start page, which forwards to the first page the role may open. */
  home: '/',
} as const;

/** Why the sign-in page is shown, from `/login?reason=…`. */
export type LoginReason = 'suspended' | 'ip' | 'password-set';

/** Path of the sign-in page with a reason banner. */
export function loginPath(reason?: LoginReason): string {
  return reason ? `${AUTH_PATHS.login}?reason=${reason}` : AUTH_PATHS.login;
}
