// The views of the Accounts page, in the order their links appear, and which of them a staff member may use. Each view
// lives in its own area folder: the page draws whatever this list holds, a role sees only the views it may use, and the first of them
// is where the bare address (or an unknown or forbidden one) lands.
import { AddAccountView } from '../create';
import { AllView } from '../list/AllView';
import { DataRequestsView } from '../requests';
import { AddRankView, EditRankView, RanksView } from '../ranks';
import type { AccountsViewSpec } from '../types';
import type { AccountGrants } from './useAccountGrants';

// A `show` rule: the staff member holds every one of these permissions.
const holds =
  (...permissions: string[]) =>
  (grants: AccountGrants) =>
    grants.canAll(permissions);

/**
 * The views: the four of the first row, then Data requests after the divider, then Edit rank without a link. The accounts need
 * `clients:read` and adding one `clients:create` too; the ranks need `groups:read` and adding one `groups:create`; the data requests
 * need `clients:read` and `customers:privacy`. A role with none of them has nothing on this page, so the page gate refuses it at the door.
 * The server still checks every call.
 */
export const ACCOUNTS_VIEW_SPECS: readonly AccountsViewSpec[] = [
  { id: 'all', label: 'All', group: 'main', show: holds('clients:read'), Component: AllView },
  {
    id: 'add',
    label: 'Add Account',
    add: true,
    group: 'main',
    show: holds('clients:read', 'clients:create'),
    Component: AddAccountView,
  },
  { id: 'ranks', label: 'Ranks', group: 'main', show: holds('groups:read'), Component: RanksView },
  {
    id: 'add-rank',
    label: 'Add Rank',
    add: true,
    group: 'main',
    show: holds('groups:read', 'groups:create'),
    Component: AddRankView,
  },
  {
    id: 'requests',
    label: 'Data requests',
    group: 'extra',
    show: holds('clients:read', 'customers:privacy'),
    Component: DataRequestsView,
  },
  {
    id: 'edit-rank',
    label: 'Edit Rank',
    group: 'hidden',
    show: holds('groups:read'),
    Component: EditRankView,
  },
];

/** The views this staff member may use, in the registry's order. Pass another list to draw it instead. */
export function usableViews(
  grants: AccountGrants,
  specs: readonly AccountsViewSpec[] = ACCOUNTS_VIEW_SPECS,
): AccountsViewSpec[] {
  return specs.filter((spec) => spec.show(grants));
}

/** The first view with a link that the role may use (null when none): where a bare, unknown or forbidden address lands. */
export function firstListedView(usable: readonly AccountsViewSpec[]): AccountsViewSpec | null {
  return usable.find((spec) => spec.group !== 'hidden') ?? null;
}
