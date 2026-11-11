// The permission check of the notification mock routes: the signed-in staff member (or, in the `readonly` scenario, the read-only role) needs the permission
// the real route names, else the answer is 403 FORBIDDEN like the server's. The inbox routes need only a session.
import { hasPermission } from '@/lib/auth/permissions';
import { problem } from '@/mocks/problem';
import { permissionsOf, roleStore } from '@/mocks/roles';
import { mockScenario } from '@/mocks/scenario';
import { currentStaff, guard } from '@/mocks/session';

/** A problem to return when the request has no session or lacks `permission`; null when it may go on. Pass no permission for a session-only route. */
export async function denied(request: Request, permission?: string): Promise<Response | null> {
  const noSession = guard(request);
  if (noSession) return noSession;
  if (!permission) return null;
  const staff = await currentStaff();
  const granted =
    mockScenario() === 'readonly'
      ? permissionsOf('viewer')
      : (roleStore().find(staff?.roleId ?? 0)?.permissions ?? []);
  return hasPermission(granted, permission)
    ? null
    : problem(403, 'FORBIDDEN', 'Forbidden', `You need the ${permission} permission.`);
}
