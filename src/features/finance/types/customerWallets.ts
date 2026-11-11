// Types for the customer wallets list (`GET /admin/customer-wallets`, feature 21): one row per storefront customer with a store
// balance. A route beyond the map, so the shape is an assumed contract that follows the backend's `customer-wallet.contracts.ts`.
import type { Id, IsoDateTime, Money } from '@/lib/api';

/** Which wallets the list keeps: money in, nothing in, below zero (after a lost chargeback), or on hold. */
export type CustomerWalletState = 'positive' | 'zero' | 'negative' | 'frozen';

/** The customer a wallet belongs to. */
export type CustomerWalletOwner = { id: Id; name: string; email: string; status: string };

/** One wallet of the list. `frozen` carries the hold's reason and time while the balance is on hold. */
export type CustomerWalletRow = {
  customer: CustomerWalletOwner;
  balance: Money;
  frozen: { at: IsoDateTime; reason: string } | null;
  updatedAt: IsoDateTime;
};

/** The filters of the list besides paging, sorting and `q` (which searches the name and the email). */
export type CustomerWalletFilters = { state?: CustomerWalletState };
