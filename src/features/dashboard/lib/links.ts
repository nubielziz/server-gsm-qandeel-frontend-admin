// Where the dashboard's rows and buttons lead. The orders addresses come from the orders feature (`ordersListPath`); the
// other pages are not built yet, so their addresses are the ones listed in ARCHITECTURE.md §5.2, which those pages honour
// once they exist. Each link also names the page it opens, so a button is shown only to staff who may open that page.
import { accountPath, accountsListPath, type AccountsListState, type AccountTab } from '@/features/accounts';
import { ordersListPath, type OrderChannel, type ServiceType } from '@/features/orders';
import type { Id } from '@/lib/api';
import type { DashboardScope } from '../types';

/** Where a link goes and the page resource it needs (`useCanOpenPage`). */
export type PageTarget = { page: string; to: string };

/** The orders channel filter for the dashboard's scope: all channels set no filter. */
export function channelOf(scope: DashboardScope): OrderChannel | '' {
  return scope === 'all' ? '' : scope;
}

/** A queue row: the open orders of one service type in the channel being shown. */
export function queueTarget(type: ServiceType, scope: DashboardScope): PageTarget {
  return { page: 'orders', to: ordersListPath({ type, channel: channelOf(scope) }) };
}

// Where one supplier or one account opens (ARCHITECTURE.md §5.2). A merchant and a storefront buyer are both accounts.
export const supplierTarget = (id: Id): PageTarget => ({
  page: 'suppliers',
  to: `/suppliers?supplier=${id}`,
});
/** One account's record, on a part of it when `tab` is given. The address comes from the accounts feature. */
export const accountTarget = (id: Id, tab?: AccountTab): PageTarget => ({
  page: 'accounts',
  to: accountPath(id, tab),
});
/** The Accounts list with some state (a population, a status, a sort). */
export const accountsListTarget = (state: AccountsListState = {}): PageTarget => ({
  page: 'accounts',
  to: accountsListPath(state),
});

/** The suppliers page itself, for the "no suppliers" state. */
export const SUPPLIERS_PAGE: PageTarget = { page: 'suppliers', to: '/suppliers' };
