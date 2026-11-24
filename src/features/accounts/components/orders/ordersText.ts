// The words of the Orders part: what an empty list says, by what the account's state allows. An account that cannot order says so, so an
// empty list is never read as "nothing happened yet".
import type { AccountRow } from '../../types';

/** The title of an empty list and the line under it (none for a plain "No orders"). */
export interface OrdersEmpty {
  title: string;
  text?: string;
}

/**
 * What the Orders part says when the account has no order. A suspended or blocked account is told why (it cannot order while it is
 * either); a guest and an anonymized account get the plain "No orders" (a guest's orders are the only way a guest shows up, and an
 * erased account has lost its history of this kind); an active account is told that orders show here once it places one.
 * @param account What the part needs of the account: its status and whether it has a login.
 */
export function ordersEmpty(account: Pick<AccountRow, 'status' | 'hasAccount'>): OrdersEmpty {
  if (account.status === 'suspended' || account.status === 'blocked') {
    return { title: 'No orders', text: `This account cannot order while it is ${account.status}.` };
  }
  if (!account.hasAccount) return { title: 'No orders' };
  if (account.status === 'active') {
    return { title: 'No orders yet', text: 'Orders show here as soon as they place one.' };
  }
  return { title: 'No orders' };
}
