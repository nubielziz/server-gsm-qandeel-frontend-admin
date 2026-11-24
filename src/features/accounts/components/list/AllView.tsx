// AllView: the "All" view of the Accounts page: every account, or the population the strip names. A "Quick Search" box (rank,
// text, status, country), one refresh tool, a dense table (checkbox, Account with its number and email, Rank, Status, Wallet, Spent 30 d,
// Orders, Last order, the open link and the "…" menu), the "With selected" strip under it and the pinned footer with the page and the
// page size. Every filter, the sort, the page and the page size live in the address; every figure and word is the server's. Money never
// moves from here in bulk: the strip offers Suspend, Reactivate and Sign out only.
import { useCallback } from 'react';
import { DataTable, FooterPager, RefreshTool, usePageClamp, useRowSelection } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useAccountCounts } from '../../hooks/useAccountCounts';
import { useAccountsList } from '../../hooks/useAccountsList';
import { useRanks } from '../../hooks/useRanks';
import { AccountDialogs } from '../record/AccountDialogs';
import { useAccountDialogs } from '../record/useAccountDialogs';
import type { AccountsViewProps, OpenAction } from '../types';
import { accountColumns } from './accountColumns';
import { AllEmpty } from './AllEmpty';
import { BulkStrip } from './BulkStrip';
import { hasFilters, listFilters, type ListAddress, type ListSort } from './listAddress';
import { QuickSearch } from './QuickSearch';
import { useListAddress } from './useListAddress';

/** The list of accounts. */
export function AllView({ grants }: AccountsViewProps) {
  const wallet = grants.can('wallet:read');
  const { address, change } = useListAddress({ wallet });
  const list = useAccountsList({
    filters: listFilters(address),
    page: address.page,
    pageSize: address.size,
    sort: { field: address.sort, order: address.dir },
    enabled: grants.ready,
  });
  const counts = useAccountCounts(grants.can('clients:read'));
  const canRanks = grants.can('groups:read');
  const ranks = useRanks(canRanks);
  const selection = useRowSelection<number>();
  const dialogs = useAccountDialogs();
  const now = useNow();

  // A change of the list leaves the ticks behind: they were about other rows.
  const { clear } = selection;
  const go = useCallback(
    (patch: Partial<ListAddress>) => {
      clear();
      change(patch);
    },
    [clear, change],
  );
  // Stable until the address moves: clearing the ticks draws the view again, and a new function would run the clamp again.
  const setPage = useCallback((page: number) => go({ page }), [go]);
  usePageClamp({
    page: address.page,
    pageSize: address.size,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });

  // A bulk action's ticks are cleared once its dialog has closed (what it covered has changed); any other action leaves them.
  const openRow: OpenAction = dialogs.open;
  const openBulk: OpenAction = (action, accounts) => dialogs.open(action, accounts, { onClosed: clear });

  const columns = accountColumns({ grants, wallet, now, onAction: openRow });
  const filtered = hasFilters(address);
  const noAccounts = counts.data?.all === 0 || (address.chip === null && !filtered && list.total === 0);
  const rankName = ranks.ranks.find((rank) => rank.id === address.rank)?.name;

  return (
    <div className="view-frame">
      <div>
        <QuickSearch
          address={address}
          ranks={ranks.ranks}
          rankLock={grants.needs('groups:read')}
          counts={counts.data}
          onApply={go}
        />
        <RefreshTool
          onRefresh={() => {
            void list.query.refetch();
            void counts.refetch();
          }}
          busy={list.query.isFetching}
        />
        <DataTable
          skin="list"
          footer={false}
          caption="Accounts"
          columns={columns}
          rows={list.accounts}
          rowKey={(account) => account.id}
          selection={selection}
          sort={{ field: address.sort, order: address.dir }}
          onSortChange={(next) => go({ sort: next.field as ListSort, dir: next.order })}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          errorTitle="Could not load the accounts"
          onRetry={() => void list.query.refetch()}
          empty={
            <AllEmpty
              address={address}
              noAccounts={noAccounts}
              filtered={filtered}
              canAdd={grants.canAll(['clients:read', 'clients:create'])}
              isOwner={grants.isOwner}
              rankName={rankName}
            />
          }
        />
        {list.accounts.length > 0 && (
          <BulkStrip rows={list.accounts} selection={selection} grants={grants} onAction={openBulk} />
        )}
      </div>
      <FooterPager
        page={address.page}
        pageSize={address.size}
        total={list.total ?? 0}
        onPage={(page) => go({ page })}
        onPageSize={(size) => go({ size })}
      />
      <AccountDialogs request={dialogs.request} onClose={dialogs.close} />
    </div>
  );
}
