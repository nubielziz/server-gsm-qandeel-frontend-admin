// What the signed-in staff member may do on the checkouts screen. Hiding a button or disabling it is a hint only: the server still
// checks every permission (ARCHITECTURE §3). The page opens with `growth:read`; sending a reminder needs `growth:send` and the funnel
// `reports:growth`.
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * `can('growth:send')` answers from the permissions in `me`. `ready` is false until `me` has loaded. `needs` gives the props for a
 * control that needs a permission: disabled, with the reason as its title, when it is missing.
 */
export function useCheckoutGrants() {
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

/** The value `useCheckoutGrants` returns, for components that take it as a prop. */
export type CheckoutGrants = ReturnType<typeof useCheckoutGrants>;
