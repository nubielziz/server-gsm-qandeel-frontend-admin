// What the signed-in staff member may do on this page. Hiding a tab or disabling a button is a hint only: the server
// still checks every permission (ARCHITECTURE §3).
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * `can('staff:suspend')` answers from the permissions in `me`. `ready` is false until `me` has loaded, so a tab is
 * not hidden for a moment just because nothing is known yet. `myIp` is the caller's address: `me.lastLoginIp`
 * (assumption: the map has no endpoint that says which address the current request comes from).
 */
export function useAccessGrants() {
  const { data: me } = useMe();
  return useMemo(() => {
    const can = (permission: string) => me !== undefined && hasPermission(me.permissions, permission);
    return {
      me,
      ready: me !== undefined,
      can,
      /** Props for a control that needs a permission: disabled, with the reason as its title, when it is missing. */
      needs: (permission: string): { disabled: boolean; title?: string } =>
        can(permission)
          ? { disabled: false }
          : { disabled: true, title: `You need the ${permission} permission` },
      myIp: me?.lastLoginIp ?? null,
    };
  }, [me]);
}

export type AccessGrants = ReturnType<typeof useAccessGrants>;
