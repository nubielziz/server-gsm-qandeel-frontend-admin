// Input helpers for the admin dialogs: cleaning what was typed, the email check, the reasons to suspend, and which
// fields of an edit actually changed. Ports the input handling of createAdmin and updateAdmin in 14-state-access.js.
import type { Role, StaffMember, UpdateStaffBody } from '../types';

/** Why an account is suspended; the dialog offers exactly these (ADMIN_SUSPEND_REASONS). */
export const ADMIN_SUSPEND_REASONS = [
  'Left the team',
  'Account may be compromised',
  'On leave',
  'Under investigation',
  'Other',
] as const;

/** A name with the spaces tidied: trimmed, and every run of spaces made one. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** An email as it is stored: trimmed and in lower case. */
export function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A rough shape check (something@something.xx); the server decides what is a real address. */
export function validEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim());
}

/** The role the Add dialog starts on: the one called Support (the demo's default), else none, so the choice is deliberate. */
export function defaultRoleId(roles: readonly Role[]): string {
  const support = roles.find((role) => role.name.trim().toLowerCase() === 'support');
  return support ? String(support.id) : '';
}

/** The reason sent to the server: the picked reason, then the note after a colon (the demo's format). */
export function suspendReason(reason: string, note: string): string {
  const extra = note.trim();
  return extra ? `${reason}: ${extra}` : reason;
}

/**
 * The fields of an edit that really changed, in the order the demo listed them (role, name, email). `canChangeRole`
 * is false when the role is locked, so a stale value in the form can never change it. An empty result means nothing changed.
 */
export function changedFields(
  staff: Pick<StaffMember, 'name' | 'email' | 'role'>,
  form: { name: string; email: string; roleId: string },
  canChangeRole: boolean,
): UpdateStaffBody {
  const body: UpdateStaffBody = {};
  const roleId = Number(form.roleId);
  if (canChangeRole && Number.isFinite(roleId) && roleId !== staff.role.id) body.roleId = roleId;
  const name = cleanName(form.name);
  if (name !== staff.name) body.name = name;
  const email = cleanEmail(form.email);
  if (email !== staff.email) body.email = email;
  return body;
}
