// Account actions on a customer (`/admin/customers/:id/account|password|sessions/revoke|suspend|reactivate|block`). Ports
// createAccountForGuest, setCustomerPassword, signOutCustomer, suspendCustomer, reactivateCustomer and blockCustomer of
// 12-state-b2c.js. The map gives no bodies (MISMATCHES M10), so every body and answer here is an assumed contract.
import { apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type {
  BlockCustomerBody,
  CreateAccountBody,
  CustomerPasswordBody,
  PasswordResult,
  SuspendCustomerBody,
} from '../types';

/**
 * Creates an account for a customer who bought as a guest: their earlier orders are linked to it, and they get either a
 * link to choose a password or a temporary one the server makes and returns once.
 * Assumed contract: body `{ mode }`, answer `{ temporaryPassword? }`.
 * @route POST /admin/customers/:id/account
 */
export function createCustomerAccount(
  id: Id,
  body: CreateAccountBody,
  init?: ApiInit,
): Promise<PasswordResult> {
  return apiPost<PasswordResult>(pathOf('/admin/customers/:id/account', { id }), body, init);
}

/**
 * Replaces a customer's password without anyone reading the old one: `reset_link` emails a link to choose a new one
 * (valid for one hour), `temporary_password` makes the server generate one, returned once, that must be changed at the next
 * sign-in. `revokeSessions` also signs them out of every device. The current password is never readable or logged.
 * Assumed contract: body `{ mode, revokeSessions }`, answer `{ temporaryPassword? }`.
 * @route POST /admin/customers/:id/password
 */
export function setCustomerPassword(
  id: Id,
  body: CustomerPasswordBody,
  init?: ApiInit,
): Promise<PasswordResult> {
  return apiPost<PasswordResult>(pathOf('/admin/customers/:id/password', { id }), body, init);
}

/**
 * Signs a customer out of every device, for a lost phone or an account that may be compromised.
 * Assumed contract: no body, no answer used.
 * @route POST /admin/customers/:id/sessions/revoke
 */
export function revokeCustomerSessions(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/customers/:id/sessions/revoke', { id }), undefined, init);
}

/**
 * Pauses an account with a reason the team can read: no sign-in and no new orders, orders in progress still finish, the
 * sessions end, and nothing is added to the blocklist. It can be reversed in one click.
 * Assumed contract: body `{ reason, note? }` (the note is sent apart), no answer used.
 * @route POST /admin/customers/:id/suspend
 */
export function suspendCustomer(id: Id, body: SuspendCustomerBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/customers/:id/suspend', { id }), body, init);
}

/**
 * Lets a suspended customer sign in and order again.
 * Assumed contract: no body, no answer used.
 * @route POST /admin/customers/:id/reactivate
 */
export function reactivateCustomer(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/customers/:id/reactivate', { id }), undefined, init);
}

/**
 * Blocks a customer for fraud, with a reason (the server adds their fingerprint to the blocklist), or lifts the block.
 * For a temporary stop use `suspendCustomer`.
 * Assumed contract: body `{ blocked: true, reason }` or `{ blocked: false }`, no answer used.
 * @route POST /admin/customers/:id/block
 */
export function blockCustomer(id: Id, body: BlockCustomerBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/customers/:id/block', { id }), body, init);
}
