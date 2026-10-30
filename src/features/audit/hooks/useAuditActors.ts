// The people the "who" filter offers, and the names and roles the list shows for an actor id. Uses the admin accounts of the
// access feature, which the staff member may not read; then the filter offers only Everyone and System.
import { useMemo } from 'react';
import { useStaffList } from '@/features/access';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

export type AuditActor = { id: number; name: string; role: string };

/**
 * `actors` are the staff accounts (name and role) when the staff member may read them, else an empty list. `roleOf`
 * finds an actor's role name by id for the details line.
 */
export function useAuditActors() {
  const { data: me } = useMe();
  const canReadStaff = me !== undefined && hasPermission(me.permissions, 'staff:read');
  const { staff } = useStaffList({ enabled: canReadStaff });
  const actors = useMemo<AuditActor[]>(
    () => staff.map((member) => ({ id: member.id, name: member.name, role: member.role.name })),
    [staff],
  );
  const roleOf = useMemo(() => {
    const roles = new Map(actors.map((actor) => [actor.id, actor.role]));
    return (id: number | null) => (id === null ? undefined : roles.get(id));
  }, [actors]);
  return { actors, roleOf };
}
