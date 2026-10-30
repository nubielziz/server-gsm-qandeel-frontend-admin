// What the signed-in staff member may do on the suppliers screens. Hiding a button or disabling it is a hint only: the
// server still checks every permission (ARCHITECTURE §3). The `suppliers:*` row of the map reads as read, create, update
// and delete (MISMATCHES M7).
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * `can('suppliers:update')` answers from the permissions in `me`. `ready` is false until `me` has loaded. `needs` gives the
 * props for a control that needs a permission: disabled, with the reason as its title, when it is missing.
 */
export function useSupplierGrants() {
  const { data: me } = useMe();
  return useMemo(() => {
    const can = (permission: string) => me !== undefined && hasPermission(me.permissions, permission);
    return {
      ready: me !== undefined,
      can,
      needs: (permission: string): { disabled: boolean; title?: string } =>
        can(permission)
          ? { disabled: false }
          : { disabled: true, title: `You need the ${permission} permission` },
    };
  }, [me]);
}

/** The value `useSupplierGrants` returns, for components that take it as a prop. */
export type SupplierGrants = ReturnType<typeof useSupplierGrants>;
