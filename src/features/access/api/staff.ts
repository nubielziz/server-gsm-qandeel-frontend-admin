// Admin account routes (`/admin/staff*`). Ports the staff functions of 14-state-access.js (createAdmin, updateAdmin,
// setAdminPassword, signOutAdmin, resetAdmin2fa, suspendAdmin, reactivateAdmin) to the API. The map gives no bodies,
// so every body and answer here is an assumed contract (MISMATCHES M10).
import {
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type {
  CreateStaffBody,
  CreateStaffResult,
  StaffMember,
  StaffPasswordBody,
  StaffPasswordResult,
  SuspendStaffBody,
  UpdateStaffBody,
} from '../types';

/**
 * The admin accounts, one page of them, with the total in `x-total-count`. The console loads the whole list (it is
 * short) to draw the figures above the table; `status` and `q` filters are available for longer lists.
 * Assumed contract: rows carry the joined `role`, `createdBy`, `suspendedBy` and the `activeSessions` count.
 * @route GET /admin/staff
 */
export function listStaff(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<StaffMember>> {
  return apiList<StaffMember>('/admin/staff', query, undefined, init);
}

/**
 * One admin account, to refresh the open drawer after an action (the list row can be a moment older).
 * Assumed contract: same joined fields as the list.
 * @route GET /admin/staff/:id
 */
export function getStaff(id: Id, init?: ApiInit): Promise<StaffMember> {
  return apiGet<StaffMember>(pathOf('/admin/staff/:id', { id }), undefined, init);
}

/**
 * Adds an admin: either an invitation email with a link to choose the password, or a temporary password the server
 * generates and returns once (`temporaryPassword`), which the console shows a single time. The server answers
 * 409 `EMAIL_TAKEN` for an address that is already an admin.
 * Assumed contract: body `{ name, email, roleId, onboarding }`, answer the new account plus `temporaryPassword?`.
 * @route POST /admin/staff
 */
export function createStaff(body: CreateStaffBody, init?: ApiInit): Promise<CreateStaffResult> {
  return apiPost<CreateStaffResult>('/admin/staff', body, init);
}

/**
 * Edits an admin's name, email or role; only the fields that change are sent. The server refuses to change your own
 * role or the role of the last active Owner, and writes the change to the audit log.
 * Assumed contract: body `{ name?, email?, roleId? }`, answer the updated account.
 * @route PATCH /admin/staff/:id
 */
export function updateStaff(id: Id, body: UpdateStaffBody, init?: ApiInit): Promise<StaffMember> {
  return apiPatch<StaffMember>(pathOf('/admin/staff/:id', { id }), body, init);
}

/**
 * Replaces an admin's password without anyone reading the old one: `reset_link` emails a set-password link (valid for
 * one hour), `temporary_password` makes the server generate one, returned once, that must be changed at the next
 * sign-in. `revokeSessions` also signs them out of every device. The current password is never readable or logged.
 * Assumed contract: body `{ mode, revokeSessions }`, answer `{ temporaryPassword? }`.
 * @route POST /admin/staff/:id/password
 */
export function setStaffPassword(
  id: Id,
  body: StaffPasswordBody,
  init?: ApiInit,
): Promise<StaffPasswordResult> {
  return apiPost<StaffPasswordResult>(pathOf('/admin/staff/:id/password', { id }), body, init);
}

/**
 * Signs an admin out of every device. Used when a laptop is lost or an account may be compromised.
 * Assumed contract: no body, no answer used.
 * @route POST /admin/staff/:id/sessions/revoke
 */
export function revokeStaffSessions(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/staff/:id/sessions/revoke', { id }), undefined, init);
}

/**
 * Suspends an admin with a reason the team can read. Their sessions end and they cannot sign in until reactivated;
 * their history stays in the audit log. The server rejects suspending yourself or the last active Owner (409).
 * Assumed contract: body `{ reason }`, no answer used.
 * @route POST /admin/staff/:id/suspend
 */
export function suspendStaff(id: Id, body: SuspendStaffBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/staff/:id/suspend', { id }), body, init);
}

/**
 * Lets a suspended admin sign in again with their existing password and 2FA.
 * Assumed contract: no body, no answer used.
 * @route POST /admin/staff/:id/reactivate
 */
export function reactivateStaff(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/staff/:id/reactivate', { id }), undefined, init);
}

/**
 * Switches off an admin's 2FA, for the case where they lost their phone. They scan a new QR code at the next sign-in.
 * Assumed contract: no body, no answer used.
 * @route POST /admin/staff/:id/reset-2fa
 */
export function resetStaffTwoFactor(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/staff/:id/reset-2fa', { id }), undefined, init);
}
