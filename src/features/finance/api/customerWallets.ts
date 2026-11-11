// The customer wallets list (`GET /admin/customer-wallets`, feature 21): every storefront customer's store balance, with the negative
// and held ones easy to find. The server filters, sorts and counts; the console only asks.
import { apiList, type ApiInit, type ListQuery, type ListResult } from '@/lib/api';
import type { CustomerWalletRow } from '../types';

/**
 * The customer wallets, one page of them, with the total in `x-total-count`. Sort with `_sort`/`_order` (`balance`, `updatedAt`;
 * the server's default is `updatedAt` newest first). Filter with `state` (`positive`, `zero`, `negative`, `frozen`) and search
 * with `q` (the customer's name and email). Needs `wallet:read`.
 * Assumed contract: rows carry the customer, the balance, the hold and when the wallet last changed.
 * @route GET /admin/customer-wallets
 */
export function listCustomerWallets(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<CustomerWalletRow>> {
  return apiList<CustomerWalletRow>('/admin/customer-wallets', query, undefined, init);
}
