// One function per `/admin/auth/*` route (the sign-in flow). Request and response bodies are the assumed
// contract of decision 006 until the backend confirms them.
import { apiGet, apiPost, type ApiInit } from '@/lib/api';
import type { LoginBody, LoginResult, Me, SetPasswordBody, TwoFactorBody, TwoFactorSetup } from '../types';

/**
 * Step 1 of sign-in: checks the email and password and starts a half-signed-in session.
 * The answer says which step comes next (authenticator code, first-time setup, or a new password).
 * Assumed contract, decision 006.
 * @route POST /admin/auth/login
 */
export function login(body: LoginBody, init?: ApiInit): Promise<LoginResult> {
  return apiPost<LoginResult>('/admin/auth/login', body, init);
}

/**
 * Step 2 of sign-in: sends the authenticator code, which completes the sign-in. Also used for the first code
 * after the setup screen. No response body is used (assumed contract, decision 006).
 * @route POST /admin/auth/2fa
 */
export function verifyTwoFactor(body: TwoFactorBody, init?: ApiInit): Promise<void> {
  return apiPost<void>('/admin/auth/2fa', body, init);
}

/**
 * First sign-in: asks for the authenticator secret and QR code to show before the first code is entered.
 * Assumed contract, decision 006.
 * @route POST /admin/auth/2fa/setup
 */
export function setupTwoFactor(init?: ApiInit): Promise<TwoFactorSetup> {
  return apiPost<TwoFactorSetup>('/admin/auth/2fa/setup', undefined, init);
}

/**
 * Ends the session on the server (the cookie is httpOnly, so only the server can clear it).
 * @route POST /admin/auth/logout
 */
export function logout(init?: ApiInit): Promise<void> {
  return apiPost<void>('/admin/auth/logout', undefined, init);
}

/**
 * The signed-in staff member with role and permissions. Feeds Refine's identity, the access checks and the
 * topbar. A 401 means nobody is signed in. Assumed contract, decision 006.
 * @route GET /admin/auth/me
 */
export function getMe(init?: ApiInit): Promise<Me> {
  return apiGet<Me>('/admin/auth/me', undefined, init);
}

/**
 * An invited or recovering staff member chooses their own password, with the one-time token from the link.
 * Without a token the half-signed-in session authorises it (temporary password). Assumed contract, decision 006.
 * @route POST /admin/auth/password/set
 */
export function setPassword(body: SetPasswordBody, init?: ApiInit): Promise<void> {
  return apiPost<void>('/admin/auth/password/set', body, init);
}
