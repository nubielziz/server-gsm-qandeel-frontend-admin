// What the signed-in staff member may do on the services screens. Hiding a button or disabling it is a hint only: the server still
// checks every permission (ARCHITECTURE §3). The same shape as the orders feature's grants, with `needsAll` for actions that
// need two permissions (for example saving group prices needs `pricing:update` and reading the groups needs `groups:read`).
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * `can('catalog:update')` answers from the permissions in `me`; `ready` is false until `me` has loaded. `needs` and
 * `needsAll` give the props for a control that needs a permission: disabled, with the missing one named in its title.
 */
export function useServiceGrants() {
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
      canAll: (permissions: readonly string[]) => permissions.every(can),
      needs: (permission: string) => needsAll(permission),
      needsAll,
    };
  }, [me]);
}

/** What `useServiceGrants` returns, for components that take the grants as a prop. */
export type ServiceGrants = ReturnType<typeof useServiceGrants>;
