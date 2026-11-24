// Who is asking, for the accounts mock routes that the real server limits to the Owner (the rank change). The mock checks no other permission:
// the screens read the session's own permissions, and the real server is the authority on every rule (decision 014).
import { isOwnerRole } from '@/lib/auth/permissions';
import { permissionsOf, roleStore } from '@/mocks/roles';
import { mockScenario } from '@/mocks/scenario';
import { currentStaff } from '@/mocks/session';

/** Whether the staff member behind the session holds the Owner's exact `*` permission (the read-only scenario never does). */
export async function callerIsOwner(): Promise<boolean> {
  if (mockScenario() === 'readonly') return isOwnerRole(permissionsOf('viewer'));
  const staff = await currentStaff();
  return isOwnerRole(roleStore().find(staff?.roleId ?? 0)?.permissions ?? []);
}
