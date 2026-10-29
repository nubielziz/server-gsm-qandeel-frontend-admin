// The numbers on the tabs. The demo had them for free from its in-memory state; here each is the length of a list
// the tabs read anyway (same query, so no second request). A count shows once its list has loaded.
import { useLiveIpRules } from './useIpRules';
import { useRoles } from './useRoles';
import { useStaffList } from './useStaffList';

export type AccessCounts = { admins?: number; allow?: number; block?: number; roles?: number };

/** `can` decides which lists to ask for: a tab the staff member may not read has nothing to count. */
export function useAccessCounts(can: (permission: string) => boolean): AccessCounts {
  const staff = useStaffList({ enabled: can('staff:read') });
  const allow = useLiveIpRules('allow', { enabled: can('access:read') });
  const block = useLiveIpRules('block', { enabled: can('access:read') });
  const roles = useRoles({ enabled: can('roles:read') });
  return {
    admins: staff.query.isSuccess ? (staff.total ?? staff.staff.length) : undefined,
    allow: allow.query.isSuccess ? allow.rules.length : undefined,
    block: block.query.isSuccess ? block.rules.length : undefined,
    roles: roles.query.isSuccess ? (roles.total ?? roles.roles.length) : undefined,
  };
}
