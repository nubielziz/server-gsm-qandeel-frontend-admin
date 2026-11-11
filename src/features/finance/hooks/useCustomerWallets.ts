// The customer wallets as a cached list: one page of the wallets that match the filters, sorted by the server (feature 21). It asks
// again every 30 seconds, like the deposit queue, so a hold or a credit shows up without a reload.
import { keepPreviousData } from '@tanstack/react-query';
import type { SortState } from '@/components/ui';
import { useApiQuery } from '@/lib/query';
import { listCustomerWallets } from '../api';
import type { WalletListState } from '../lib/walletView';
import { CUSTOMER_WALLETS_KEY, REFRESH_MS } from './keys';

export type CustomerWalletsArgs = {
  filters: WalletListState;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `data.data` is the page and `data.total` what the server counted for the whole filter. */
export function useCustomerWallets({ filters, page, pageSize, sort, enabled = true }: CustomerWalletsArgs) {
  const q = filters.q.trim();
  return useApiQuery({
    queryKey: [...CUSTOMER_WALLETS_KEY, filters.state, q, page, pageSize, sort.field, sort.order],
    queryFn: ({ signal }) =>
      listCustomerWallets(
        {
          start: (page - 1) * pageSize,
          end: page * pageSize,
          sort: [sort.field],
          order: [sort.order],
          q: q || undefined,
          filters: { state: filters.state || undefined },
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
    enabled,
  });
}
