// The permission sets the account tests sign in with: the Owner, a manager who has every permission but not `*`, a reader, a role that sees
// only the ranks, and a role without the wallet permissions (the Accounts page's tests). Import it from tests only.
import { PERMISSION_CATALOG } from '@/mocks/roles';

/** Every permission of the catalog, written out: a role that lists them is not the Owner (`isOwnerRole` needs an exact `*`). */
const EVERY_PERMISSION = [...PERMISSION_CATALOG];

export const ACCOUNT_TEST_ROLES = {
  owner: ['*'],
  manager: EVERY_PERMISSION,
  reader: ['clients:read'],
  groupsOnly: ['groups:read'],
  noWallet: EVERY_PERMISSION.filter((permission) => !permission.startsWith('wallet:')),
} as const satisfies Record<string, readonly string[]>;

/** The name of one of the roles above. */
export type AccountTestRole = keyof typeof ACCOUNT_TEST_ROLES;
