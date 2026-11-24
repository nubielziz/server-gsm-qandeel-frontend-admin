// What the signed-in staff member may do on the Accounts page. Hiding a button or disabling it is a hint only: the server still checks
// every permission (ARCHITECTURE §3). The shape of the services feature's grants, plus the Owner rule: the rank
// change, a merchant rank in +Add Account and a new API key are offered to the Owner role (an exact `*` grant) only.
import { useMemo } from 'react';
import { useMe, type Me } from '@/features/auth';
import { hasPermission, isOwnerRole } from '@/lib/auth/permissions';

/** The props of a control that needs something it may not have: disabled, with the reason as its title. */
export type GrantLock = { disabled: boolean; title?: string };

/** What the page asks of the permissions. `ready` is false until `me` has loaded. */
export interface AccountGrants {
  me: Me | undefined;
  ready: boolean;
  can: (permission: string) => boolean;
  canAll: (permissions: readonly string[]) => boolean;
  /** The lock of a control that needs one permission: "You need the X permission". */
  needs: (permission: string) => GrantLock;
  /** The lock of a control that needs several: the missing ones are named. */
  needsAll: (...permissions: string[]) => GrantLock;
  /** The role is the Owner's (an exact `*`). */
  isOwner: boolean;
  /** The lock of a control only the Owner may use, with the reason as its title. */
  ownerLock: (reason: string) => GrantLock;
}

/**
 * The grants of a list of permissions (undefined while they load). Pure, so each rule is a test row; `useAccountGrants` calls it with
 * the permissions of `me`.
 */
export function buildGrants(permissions: readonly string[] | undefined, me?: Me): AccountGrants {
  const can = (permission: string) => permissions !== undefined && hasPermission(permissions, permission);
  const needsAll = (...required: string[]): GrantLock => {
    const missing = required.filter((permission) => !can(permission));
    return missing.length === 0
      ? { disabled: false }
      : { disabled: true, title: `You need the ${missing.join(' and ')} permission` };
  };
  const isOwner = permissions !== undefined && isOwnerRole(permissions);
  return {
    me,
    ready: permissions !== undefined,
    can,
    canAll: (required) => required.every(can),
    needs: (permission) => needsAll(permission),
    needsAll,
    isOwner,
    ownerLock: (reason) => (isOwner ? { disabled: false } : { disabled: true, title: reason }),
  };
}

/** The grants of the signed-in staff member. */
export function useAccountGrants(): AccountGrants {
  const { data: me } = useMe();
  return useMemo(() => buildGrants(me?.permissions, me), [me]);
}
