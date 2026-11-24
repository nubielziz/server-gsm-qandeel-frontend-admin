// The staff security tools on an account (`/admin/clients/:id/password|reset-2fa|sessions/revoke|verify-email/resend`): every account with
// a login; a guest answers 409 `NO_ACCOUNT`. Shapes are taken from the backend's security contracts. Every call needs `clients:security`;
// the server writes the audit entry and mails the person where the contract says so.
import { apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { AccountPasswordBody, PasswordResult } from '../types';

/**
 * Gives an account a new password without anyone reading the old one. `reset_link` emails a one-hour link (an invitation while the
 * account has no password) and answers which mail went out in `link`; `temporary_password` makes the server generate one, returned
 * once in `temporaryPassword`, that must be changed at the next sign-in. `revokeSessions` also signs the account out everywhere.
 * Refusals: `NO_ACCOUNT` (409, a guest), `NOT_ACTIVE` (409, not an active account), `RATE_LIMITED` (429, five link mails an hour).
 * @route POST /admin/clients/:id/password
 */
export function setAccountPassword(
  id: Id,
  body: AccountPasswordBody,
  init?: ApiInit,
): Promise<PasswordResult> {
  return apiPost<PasswordResult>(pathOf('/admin/clients/:id/password', { id }), body, init);
}

/**
 * Turns two-step sign-in off for an account, ends every session of theirs and mails them a security notice. Refusal:
 * `TWOFA_NOT_ENABLED` (409).
 * @route POST /admin/clients/:id/reset-2fa
 */
export function resetAccountTwoFactor(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/clients/:id/reset-2fa', { id }), undefined, init);
}

/**
 * Signs an account out of every device, a sign-in step in progress included. Answers 204 also when there was no session; the
 * person is not mailed.
 * @route POST /admin/clients/:id/sessions/revoke
 */
export function revokeAccountSessions(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/clients/:id/sessions/revoke', { id }), undefined, init);
}

/**
 * Emails the account a new one-hour verification link (it replaces the older one). Refusals: `CONFLICT` (409, already verified),
 * `NOT_ACTIVE` (409, not active), `RATE_LIMITED` (429, five mails an hour).
 * @route POST /admin/clients/:id/verify-email/resend
 */
export function resendAccountVerification(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/clients/:id/verify-email/resend', { id }), undefined, init);
}
