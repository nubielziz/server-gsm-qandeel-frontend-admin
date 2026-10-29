// Refine auth provider (decision 006): the two-step sign-in, session check, identity and sign-out reasons,
// all backed by `/admin/auth/*`. The session itself is an httpOnly cookie; this file keeps no tokens.
//
// Note for the sign-in screens: Refine's `useLogin` navigates to `?to=` when the URL has one, ahead of the
// `redirectTo` returned here. After step 1 the user is only half signed in, so those screens should follow
// the returned `redirectTo` themselves (for example through `mutationOptions.onSuccess`).
import type { AuthActionResponse, AuthProvider, CheckResponse, OnErrorResponse } from '@refinedev/core';
import {
  AUTH_PATHS,
  loginPath,
  login as loginRequest,
  logout as logoutRequest,
  setPassword,
  verifyTwoFactor,
  type LoginResult,
} from '@/features/auth';
import { ERROR_CODES, forgetCsrfToken, isApiError } from '@/lib/api';
import { meCache as appMeCache, type MeCache } from './meCache';

/** Step 1 sends the credentials; step 2 sends the authenticator code. */
export type LoginParams = { email: string; password: string } | { code: string };

// Where each answer of step 1 sends the user next.
const NEXT_PATH: Record<LoginResult['next'], string> = {
  totp: AUTH_PATHS.twoFactor,
  totp_setup: AUTH_PATHS.setupTwoFactor,
  password: AUTH_PATHS.setPassword,
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** The sign-in page to land on after a failed check, with the reason when the account is suspended or the IP blocked. */
function loginRedirect(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === ERROR_CODES.ACCOUNT_SUSPENDED) return loginPath('suspended');
    if (error.code === ERROR_CODES.IP_NOT_ALLOWED) return loginPath('ip');
  }
  return AUTH_PATHS.login;
}

/** True when an error means the server no longer accepts this session: 401, a suspended account or a blocked IP. */
function endsSession(error: unknown): boolean {
  if (isApiError(error)) {
    return (
      error.status === 401 ||
      error.code === ERROR_CODES.ACCOUNT_SUSPENDED ||
      error.code === ERROR_CODES.IP_NOT_ALLOWED
    );
  }
  // Errors from other sources (a custom data provider call) can still carry a status.
  return (error as { statusCode?: number } | null)?.statusCode === 401;
}

/** Builds the provider around a `me` cache, so tests can use their own. */
export function createAuthProvider(cache: MeCache = appMeCache): AuthProvider {
  return {
    // Handles both steps: `{ email, password }` first, then `{ code }`. Failures are returned, not thrown,
    // with the ApiError so the form can show field messages, the request id and the retry time.
    async login(params: LoginParams): Promise<AuthActionResponse> {
      cache.clear();
      try {
        if ('code' in params) {
          await verifyTwoFactor({ code: params.code });
          return { success: true, redirectTo: AUTH_PATHS.home };
        }
        const result = await loginRequest({ email: params.email, password: params.password });
        // Two-factor sign-in is mandatory, so an unknown answer is treated as "ask for the code".
        return { success: true, redirectTo: NEXT_PATH[result?.next] ?? AUTH_PATHS.twoFactor };
      } catch (error) {
        return { success: false, error: toError(error) };
      }
    },

    // Signed in means `me` answers. Only an answer that says the session is over (401, suspended account, blocked IP)
    // signs the user out. A network failure, a 5xx or a 429 says nothing about the session, so the shell stays up and
    // each page shows its own error state with Retry (ARCHITECTURE §4) instead of bouncing to the sign-in screen.
    async check(): Promise<CheckResponse> {
      try {
        await cache.get();
        return { authenticated: true };
      } catch (error) {
        if (!endsSession(error)) return { authenticated: true, error: toError(error) };
        return { authenticated: false, redirectTo: loginRedirect(error), error: toError(error) };
      }
    },

    async getIdentity() {
      return cache.get();
    },

    async getPermissions() {
      return (await cache.get()).permissions;
    },

    // Refine calls this for failed data requests. 401 and the two blocked-account codes end the session;
    // FORBIDDEN stays on the page, because the user is signed in and only lacks that permission.
    async onError(error: unknown): Promise<OnErrorResponse> {
      if (endsSession(error)) {
        cache.clear();
        return { logout: true, redirectTo: loginRedirect(error), error: toError(error) };
      }
      return {};
    },

    // Ends the session on the server first. If the server already refuses the session (401, suspended account,
    // blocked IP) that counts as done; any other failure keeps the user signed in and reports the error.
    async logout(): Promise<AuthActionResponse> {
      try {
        await logoutRequest();
      } catch (error) {
        if (!endsSession(error)) return { success: false, error: toError(error) };
      }
      cache.clear();
      forgetCsrfToken();
      return { success: true, redirectTo: AUTH_PATHS.login };
    },

    // Invite and reset links: `{ token, password }` (Refine adds the token from the URL).
    async updatePassword(params: { token?: string; password: string }): Promise<AuthActionResponse> {
      try {
        await setPassword({ token: params.token, password: params.password });
        cache.clear();
        return { success: true, redirectTo: loginPath('password-set') };
      } catch (error) {
        return { success: false, error: toError(error) };
      }
    },
  };
}

export const authProvider: AuthProvider = createAuthProvider();
