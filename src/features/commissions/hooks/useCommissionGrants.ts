// What the signed-in staff member may do on the Commissions page. Hiding a button or disabling it is a hint only: the server still
// checks every permission (ARCHITECTURE §3). The same shape as the services feature's grants: `needs` and `needsAll` give the props
// of a control that needs a permission, disabled with the missing one named in its title.
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

/** `can('commissions:approve')` answers from the permissions in `me`; `ready` is false until `me` has loaded. */
export function useCommissionGrants() {
  const { data: me } = useMe();
  return useMemo(() => {
    const can = (permission: string) => me !== undefined && hasPermission(me.permissions, permission);
    const needsAll = (...permissions: string[]): { disabled: boolean; title?: string } => {
      const missing = permissions.filter((permission) => !can(permission));
      return missing.length === 0
        ? { disabled: false }
        : { disabled: true, title: `You need the ${missing.join(' and ')} permission` };
    };
    return {
      me,
      ready: me !== undefined,
      can,
      needs: (permission: string) => needsAll(permission),
      needsAll,
    };
  }, [me]);
}

/** What `useCommissionGrants` returns, for components that take the grants as a prop. */
export type CommissionGrants = ReturnType<typeof useCommissionGrants>;
