// RanksView: the "Ranks" view of the Accounts page: every rank in the server's order as a dense list (name, kind, discount, credit, deposit limit,
// accounts, a square-pen link to its edit view), with the "With selected" strip (Delete) and the footer pager under it. The ranks are few, so they
// are read whole and cut into pages here; the page and its size live in the address. Needs groups:read. Ports the groups tab of the merchants page.
import { useMemo } from 'react';
import {
  ButtonLink,
  DataTable,
  EmptyState,
  FooterPager,
  usePageClamp,
  useRowSelection,
} from '@/components/ui';
import { accountsListPath } from '../../lib/paths';
import { useRanks } from '../../hooks/useRanks';
import type { AccountsViewProps } from '../types';
import { RankBulkBar } from './RankBulkBar';
import { rankColumns } from './rankColumns';
import { pageOf } from './rankList';
import { useRanksAddress } from './useRanksAddress';

/** The ranks, one page at a time. The words, the figures and the order are the server's. */
export function RanksView({ grants }: AccountsViewProps) {
  const { ranks, total, query } = useRanks(grants.can('groups:read'));
  const address = useRanksAddress();
  const selection = useRowSelection<number>();
  const columns = useMemo(() => rankColumns(), []);
  const rows = pageOf(ranks, address.page, address.size);
  usePageClamp({
    page: address.page,
    pageSize: address.size,
    total: ranks.length,
    settled: query.isSuccess && !query.isFetching,
    setPage: address.setPage,
  });

  // A tick belongs to the page it was made on: a new page or size starts with none, so Delete never reaches a rank out of sight.
  const toPage = (next: number) => {
    selection.clear();
    address.setPage(next);
  };
  const toSize = (next: number) => {
    selection.clear();
    address.setSize(next);
  };

  return (
    <div className="view-frame">
      <div>
        <DataTable
          skin="list"
          footer={false}
          caption="Ranks"
          columns={columns}
          rows={rows}
          rowKey={(rank) => rank.id}
          selection={selection}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          errorTitle="Could not load the ranks"
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState
              icon="tag"
              title="No ranks yet"
              cta={
                grants.canAll(['groups:read', 'groups:create']) ? (
                  <ButtonLink to={accountsListPath({ view: 'add-rank' })}>Add a rank</ButtonLink>
                ) : undefined
              }
            >
              A rank sets the discount and the deposit limit its accounts get.
            </EmptyState>
          }
        />
        {rows.length > 0 && (
          <RankBulkBar
            selected={rows.filter((rank) => selection.has(rank.id))}
            onCheckAll={() =>
              selection.setMany(
                rows.map((rank) => rank.id),
                true,
              )
            }
            onUncheckAll={selection.clear}
            onDone={selection.clear}
            grants={grants}
          />
        )}
        {total !== undefined && total > ranks.length && (
          <p className="px-3.5 py-2 text-xs text-ink3">
            Only the first {ranks.length} of {total} ranks are listed.
          </p>
        )}
      </div>
      <FooterPager
        page={address.page}
        pageSize={address.size}
        total={ranks.length}
        onPage={toPage}
        onPageSize={toSize}
      />
    </div>
  );
}
