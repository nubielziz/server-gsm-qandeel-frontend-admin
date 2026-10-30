// What the signed-in staff member may do on the Finance page. Hiding a tab or disabling a button is a hint only: the server
// still checks every permission (ARCHITECTURE §3).
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * `can('payments:approve')` answers from the permissions in `me`; a list means any one of them. `ready` is false until `me`
 * has loaded. `needs` gives the props for a control that needs a permission: disabled, with the reason as its title, when
 * it is missing.
 */
export function useFinanceGrants() {
  const { data: me } = useMe();
  return useMemo(() => {
    const permissions = me?.permissions ?? [];
    const can = (permission: string | readonly string[]) =>
      me !== undefined && hasPermission(permissions, permission);
    return {
      me,
      ready: me !== undefined,
      permissions,
      can,
      needs: (permission: string): { disabled: boolean; title?: string } =>
        can(permission)
          ? { disabled: false }
          : { disabled: true, title: `You need the ${permission} permission` },
    };
  }, [me]);
}

export type FinanceGrants = ReturnType<typeof useFinanceGrants>;
