// Client hints for admin accounts, ported from suspendAdmin and updateAdmin of 14-state-access.js. They disable a
// control and say why; the server still enforces the same rules and its answer is always shown.
import type { Role, StaffMember } from '../types';
import type { Guard } from './ipGuards';

const OK: Guard = { ok: true };
const refuse = (reason: string): Guard => ({ ok: false, reason });

/** Said when the last active Owner would lose their role or their access. */
export const KEEP_ONE_OWNER = 'There must always be one active Owner. Make someone else an Owner first.';

/**
 * Whether a member holds an Owner role. The demo had one fixed "owner" role; roles are records now, so an Owner is
 * a member of the role called "Owner" or of any role that holds the wildcard permission `*` (assumption).
 */
export function isOwner(member: Pick<StaffMember, 'role'>, roles: readonly Role[] = []): boolean {
  if (member.role.name.trim().toLowerCase() === 'owner') return true;
  return roles.find((role) => role.id === member.role.id)?.permissions.includes('*') ?? false;
}

/** How many Owners can sign in right now. */
export function activeOwnerCount(staff: readonly StaffMember[], roles: readonly Role[] = []): number {
  return staff.filter((member) => member.status === 'active' && isOwner(member, roles)).length;
}

type GuardInput = {
  target: StaffMember;
  /** The signed-in staff member's id. */
  meId: number | undefined;
  staff: readonly StaffMember[];
  roles?: readonly Role[];
};

/** Suspending: not yourself, not someone already suspended, not the last active Owner. */
export function suspendGuard({ target, meId, staff, roles = [] }: GuardInput): Guard {
  if (target.id === meId) return refuse('You cannot suspend yourself.');
  if (target.status === 'suspended') return refuse('This account is already suspended.');
  if (isOwner(target, roles) && activeOwnerCount(staff, roles) < 2) return refuse(KEEP_ONE_OWNER);
  return OK;
}

/** Changing a role: not your own, and not the last active Owner's. */
export function roleChangeGuard({ target, meId, staff, roles = [] }: GuardInput): Guard {
  if (target.id === meId) return refuse('You cannot change your own role. Ask another Owner.');
  if (target.status === 'active' && isOwner(target, roles) && activeOwnerCount(staff, roles) < 2) {
    return refuse(KEEP_ONE_OWNER);
  }
  return OK;
}
