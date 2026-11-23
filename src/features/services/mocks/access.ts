// What the signed-in mock session may do, for the service routes that leave keys out or refuse a filter by permission (the Catalog
// keys and the shop filters). The mock server checks no permission elsewhere in this feature; the app's own `me` is what the screens see.
import { hasPermission } from '@/lib/auth/permissions';
import { problem } from '@/mocks/problem';
import { permissionsOf, roleStore } from '@/mocks/roles';
import { mockScenario } from '@/mocks/scenario';
import { currentStaff } from '@/mocks/session';

/** The permissions of the staff member behind the session (the read-only role in the `readonly` scenario); none without a role. */
export async function sessionPermissions(): Promise<string[]> {
  if (mockScenario() === 'readonly') return permissionsOf('viewer');
  const staff = await currentStaff();
  return roleStore().find(staff?.roleId ?? 0)?.permissions ?? [];
}

/** Whether a permission list covers `permission` (`area:*` and `*` included). */
export function covers(granted: readonly string[], permission: string): boolean {
  return hasPermission(granted, permission);
}

/** The 403 the server answers when a filter needs a permission the session lacks: the filter is refused, never ignored. */
export function forbidden(permission: string, filter: string): Response {
  return problem(
    403,
    'FORBIDDEN',
    'Forbidden',
    `You need the ${permission} permission to filter by ${filter}.`,
  );
}
