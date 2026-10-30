// The sidebar counts (open orders, pending deposits, held risk orders…), read from the dashboard payload. Ports the `badges`
// of renderNav() in 90-app.js. The app shell calls this on every page through `manifest.ts` (`useNavCounts`).
import { useMemo } from 'react';
import type { NavCounts } from '@/app/layout/useNavCounts';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';
import { toNavCounts } from '../lib/navCounts';
import { useDashboard } from './useDashboard';

const NO_COUNTS: NavCounts = {};

/**
 * The counts for the sidebar. It makes the dashboard's default call (all channels, 7 days), which the dashboard page
 * shares, and asks again every minute. Without `dashboard:read` it makes no call and the sidebar shows no counts.
 */
export function useDashboardNavCounts(): NavCounts {
  const { data: me } = useMe();
  const allowed = me !== undefined && hasPermission(me.permissions, 'dashboard:read');
  const { data } = useDashboard({ scope: 'all', days: 7 }, { enabled: allowed });
  return useMemo(() => (allowed && data ? toNavCounts(data.navCounts) : NO_COUNTS), [allowed, data]);
}
