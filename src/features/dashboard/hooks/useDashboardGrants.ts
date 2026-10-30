// What the signed-in staff member may see on the dashboard besides the page itself: the top merchants list (`reports:read`)
// and the queue monitor link (`queues:read`). Hiding them is a hint only; the server refuses the calls without the permission.
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';
import { queuesBoardUrl } from '../api';

/** `reports` and `queues` say whether the staff member may see the top merchants and the queue monitor link; both are `false` until `me` loads. */
export function useDashboardGrants() {
  const { data: me } = useMe();
  return useMemo(() => {
    const can = (permission: string) => me !== undefined && hasPermission(me.permissions, permission);
    return { reports: can('reports:read'), queues: can('queues:read') };
  }, [me]);
}

/** The queue monitor's address for staff with `queues:read`, else `null` (no link is shown). */
export function useQueueMonitorUrl(): string | null {
  const { queues } = useDashboardGrants();
  return queues ? queuesBoardUrl() : null;
}
