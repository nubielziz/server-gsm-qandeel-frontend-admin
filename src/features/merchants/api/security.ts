// The staff security tools on a merchant (`/admin/clients/:id/password|reset-2fa|sessions/revoke|verify-email/resend`), backend
// feature 20 (routes R1-R4). Shapes are taken from the backend's `client-security.contracts.ts`. Every call needs
// `clients:security`; the server writes the audit entry and mails the merchant where the contract says so.
import { apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { ClientPasswordBody, ClientPasswordResult } from '../types';

/**
 * Gives a merchant a new password without anyone reading the old one. `reset_link` emails a one-hour link (an invitation while
 * the merchant has no password) and answers which mail went out in `link`; `temporary_password` makes the server generate one,
 * returned once in `temporaryPassword`, that must be changed at the next sign-in. `revokeSessions` also signs the merchant out
 * everywhere. Refusals: `NOT_ACTIVE` (409, suspended merchant), `RATE_LIMITED` (429, five link mails an hour).
 * @route POST /admin/clients/:id/password
 */
export function setClientPassword(
  id: Id,
  body: ClientPasswordBody,
  init?: ApiInit,
): Promise<ClientPasswordResult> {
  return apiPost<ClientPasswordResult>(pathOf('/admin/clients/:id/password', { id }), body, init);
}

/**
 * Turns two-factor sign-in off for a merchant, ends every session of theirs and mails them a security notice. Refusal:
 * `TWOFA_NOT_ENABLED` (409).
 * @route POST /admin/clients/:id/reset-2fa
 */
export function resetClientTwoFactor(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/clients/:id/reset-2fa', { id }), undefined, init);
}

/**
 * Signs a merchant out of every device, a sign-in step in progress included. Answers 204 also when there was no session; the
 * merchant is not mailed.
 * @route POST /admin/clients/:id/sessions/revoke
 */
export function revokeClientSessions(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/clients/:id/sessions/revoke', { id }), undefined, init);
}

/**
 * Emails the merchant a new one-hour verification link (it replaces the older one). Refusals: `CONFLICT` (409, already
 * verified), `NOT_ACTIVE` (409, suspended), `RATE_LIMITED` (429, five mails an hour).
 * @route POST /admin/clients/:id/verify-email/resend
 */
export function resendClientVerification(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/clients/:id/verify-email/resend', { id }), undefined, init);
}
