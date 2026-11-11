// What the signed-in staff member may do with campaigns. Hiding a button or disabling it is a hint only: the server still checks every
// permission (ARCHITECTURE §3). The page opens with `broadcasts:read`; writing and sending need `broadcasts:send`. The pickers need the
// read permission of the list they use.
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * `can('broadcasts:send')` answers from the permissions in `me`. `ready` is false until `me` has loaded. `needs` gives the props for a control
 * that needs a permission: disabled, with the reason as its title, when it is missing.
 */
export function useBroadcastGrants() {
  const { data: me } = useMe();
  return useMemo(() => {
    const can = (permission: string) => me !== undefined && hasPermission(me.permissions, permission);
    return {
      ready: me !== undefined,
      can,
      canSend: can('broadcasts:send'),
      needs: (permission: string): { disabled: boolean; title?: string } =>
        can(permission)
          ? { disabled: false }
          : { disabled: true, title: `You need the ${permission} permission` },
    };
  }, [me]);
}

/** The value `useBroadcastGrants` returns, for components that take it as a prop. */
export type BroadcastGrants = ReturnType<typeof useBroadcastGrants>;
