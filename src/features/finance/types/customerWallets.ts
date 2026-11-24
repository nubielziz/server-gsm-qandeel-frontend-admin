// Types for the store balances list (`GET /admin/customer-wallets`): one row per account whose live wallet is a store balance (a
// retail rank). A route beyond the map, so the shape is an assumed contract that follows the backend's wallet contracts. The route and
// the `customer` key keep their names on the wire; the row's `customer.id` is the account id.
import type { Id, IsoDateTime, Money } from '@/lib/api';

/** Which balances the list keeps: money in, nothing in, below zero (after a lost chargeback), or on hold. */
export type CustomerWalletState = 'positive' | 'zero' | 'negative' | 'frozen';

/** The account a store balance belongs to; `id` is the account id. */
export type CustomerWalletOwner = { id: Id; name: string; email: string; status: string };

/** One store balance of the list. `frozen` carries the hold's reason and time while the balance is on hold. */
export type CustomerWalletRow = {
  customer: CustomerWalletOwner;
  balance: Money;
  frozen: { at: IsoDateTime; reason: string } | null;
  updatedAt: IsoDateTime;
};

/** The filters of the list besides paging, sorting and `q` (which searches the name and the email). */
export type CustomerWalletFilters = { state?: CustomerWalletState };
