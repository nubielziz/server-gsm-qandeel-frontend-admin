// What the signed-in staff member may do on the System health page. Hiding a button or disabling it is a hint only: the
// server still checks every permission (ARCHITECTURE §3).
import { useMemo } from 'react';
import { useMe } from '@/features/auth';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * Every permission that lets someone change something on this page. Holding none of them is the "read-only" case
 * (design: Controls and confirmation). `x:*` grants in a role are matched by `hasPermission`, so they count too.
 */
export const WRITE_PERMISSIONS = [
  'system:manage',
  'alerts:create',
  'alerts:update',
  'alerts:delete',
  'incidents:create',
  'incidents:update',
  'suppliers:update',
] as const;

/**
 * `can('system:manage')` answers from the permissions in `me`; a list means any one of them. `ready` is false until
 * `me` has loaded. `needs` gives the props for a control that needs one permission: disabled, with the reason as its
 * title, when it is missing. `readOnly` is true once `me` has loaded and none of the write permissions is granted: the
 * page then shows no action buttons at all.
 */
export function useHealthGrants() {
  const { data: me } = useMe();
  return useMemo(() => {
    const permissions = me?.permissions ?? [];
    const can = (permission: string | readonly string[]) =>
      me !== undefined && hasPermission(permissions, permission);
    return {
      ready: me !== undefined,
      can,
      needs: (permission: string): { disabled: boolean; title?: string } =>
        can(permission)
          ? { disabled: false }
          : { disabled: true, title: `You need the ${permission} permission` },
      readOnly: me !== undefined && !can(WRITE_PERMISSIONS),
    };
  }, [me]);
}

/** What `useHealthGrants` returns, for the components that take it as a prop. */
export type HealthGrants = ReturnType<typeof useHealthGrants>;
