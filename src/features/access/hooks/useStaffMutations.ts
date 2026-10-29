// The actions on admin accounts, each with the toast the demo showed and the reads it makes stale. The dialogs show a
// failed call themselves (in the error slot, or under the field the server named), so none of these toasts an error.
import { useApiMutation, type InvalidateTarget } from '@/lib/query';
import {
  createStaff,
  reactivateStaff,
  resetStaffTwoFactor,
  revokeStaffSessions,
  setStaffPassword,
  suspendStaff,
  updateStaff,
} from '../api';
import { sessionsText } from '../lib/staffText';
import type { CreateStaffBody, StaffMember, StaffPasswordBody, UpdateStaffBody } from '../types';
import { SESSIONS_KEY } from './keys';

// A change to one account refreshes the lists and that account's detail; the roles list counts staff per role.
const accountAndRoles = (id?: number): InvalidateTarget[] => [
  { resource: 'staff', id },
  { resource: 'roles' },
];

const NO_ERROR_TOAST = () => false as const;

/** Names the demo's toast gave to the fields of an edit. */
const FIELD_LABELS: Record<keyof UpdateStaffBody, string> = { roleId: 'role', name: 'name', email: 'email' };

/** Adds an admin. The answer carries `temporaryPassword` once when that onboarding was chosen. */
export function useCreateStaff() {
  return useApiMutation({
    mutationFn: (body: CreateStaffBody) => createStaff(body),
    // The answer may carry a one-time temporary password: drop it as soon as the dialog is gone.
    gcTime: 0,
    invalidates: accountAndRoles(),
    successNotification: (created, body) => ({
      message: `${created.name} added as ${created.role.name}`,
      description:
        body.onboarding === 'invite'
          ? `An invitation was sent to ${created.email}. It works for 1 hour.`
          : 'Temporary password set. They must change it at first sign-in.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of an admin; the toast lists which ones changed. */
export function useUpdateStaff() {
  return useApiMutation({
    mutationFn: ({ staff, body }: { staff: StaffMember; body: UpdateStaffBody }) =>
      updateStaff(staff.id, body),
    invalidates: (_updated, { staff }) => accountAndRoles(staff.id),
    successNotification: (_updated, { body }) => ({
      message: 'Admin updated',
      description: `${(Object.keys(body) as (keyof UpdateStaffBody)[]).map((key) => FIELD_LABELS[key]).join(', ')} changed.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Sends a set-password link or sets a temporary password (returned once), optionally signing the admin out everywhere. */
export function useSetStaffPassword() {
  return useApiMutation({
    mutationFn: ({ staff, body }: { staff: StaffMember; body: StaffPasswordBody }) =>
      setStaffPassword(staff.id, body),
    // Same for a temporary password set here.
    gcTime: 0,
    invalidates: (_result, { staff }) => accountAndRoles(staff.id),
    invalidateKeys: [SESSIONS_KEY],
    successNotification: (_result, { staff, body }) =>
      body.mode === 'reset_link'
        ? { message: 'Reset link sent', description: `Sent to ${staff.email}. It works for 1 hour.` }
        : { message: 'Temporary password set', description: `${staff.name} must change it at next sign-in.` },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Signs an admin out of every device. */
export function useRevokeStaffSessions() {
  return useApiMutation({
    mutationFn: (staff: StaffMember) => revokeStaffSessions(staff.id),
    invalidates: (_result, staff) => accountAndRoles(staff.id),
    invalidateKeys: [SESSIONS_KEY],
    successNotification: (_result, staff) => ({
      message: `${staff.name} signed out`,
      description: `${sessionsText(staff.activeSessions)} ended.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Suspends an admin with a reason; their sessions end. */
export function useSuspendStaff() {
  return useApiMutation({
    mutationFn: ({ staff, reason }: { staff: StaffMember; reason: string }) =>
      suspendStaff(staff.id, { reason }),
    invalidates: (_result, { staff }) => accountAndRoles(staff.id),
    invalidateKeys: [SESSIONS_KEY],
    successNotification: (_result, { staff }) => ({
      message: `${staff.name} suspended`,
      description: staff.activeSessions
        ? `${sessionsText(staff.activeSessions)} ended.`
        : 'They cannot sign in.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Lets a suspended admin sign in again. */
export function useReactivateStaff() {
  return useApiMutation({
    mutationFn: (staff: StaffMember) => reactivateStaff(staff.id),
    invalidates: (_result, staff) => accountAndRoles(staff.id),
    successNotification: (_result, staff) => ({ message: `${staff.name} reactivated` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Switches off an admin's 2FA so they set it up again at the next sign-in. */
export function useResetStaffTwoFactor() {
  return useApiMutation({
    mutationFn: (staff: StaffMember) => resetStaffTwoFactor(staff.id),
    invalidates: (_result, staff) => accountAndRoles(staff.id),
    invalidateKeys: [SESSIONS_KEY],
    successNotification: (_result, staff) => ({
      message: `2FA reset for ${staff.name}`,
      description: 'They will scan a new QR code at next sign-in.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
