// WalletsTab: the "Store balances" tab of the Finance page (feature 21): every account's store balance, with a state
// filter and search so the negative and held ones are easy to find. The server filters, sorts and counts; the tab only composes.
import { usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useCustomerWallets } from '../hooks/useCustomerWallets';
import type { FinanceGrants } from '../hooks/useFinanceGrants';
import { useWalletView } from '../hooks/useWalletView';
import { hasWalletFilters } from '../lib/walletView';
import { PAGE_SIZE } from '../lib/url';
import { WalletsEmpty } from './WalletsEmpty';
import { WalletsTable } from './WalletsTable';
import { WalletsToolbar } from './WalletsToolbar';

export function WalletsTab({ grants }: { grants: FinanceGrants }) {
  const view = useWalletView();
  const now = useNow();
  const list = useCustomerWallets({
    filters: view.filters,
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
    enabled: grants.can('wallet:read'),
  });
  const rows = list.data?.data ?? [];
  const total = list.data?.total;
  // A shrinking list (a filter, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total,
    settled: list.isSuccess && !list.isPlaceholderData,
    setPage: view.setPage,
  });

  return (
    <>
      <WalletsToolbar
        filters={view.filters}
        onChange={view.setFilters}
        onClear={view.clearFilters}
        total={total}
      />
      <div className="border-t border-line">
        <WalletsTable
          rows={rows}
          state={list.isLoading ? 'loading' : list.isError ? 'error' : 'ready'}
          error={list.error}
          onRetry={() => void list.refetch()}
          now={now}
          sort={view.sort}
          onSortChange={view.setSort}
          pagination={{ page: view.page, pageSize: PAGE_SIZE, total: total ?? rows.length }}
          onPageChange={view.setPage}
          empty={<WalletsEmpty filtersOn={hasWalletFilters(view.filters)} onClear={view.clearFilters} />}
        />
      </div>
    </>
  );
}
