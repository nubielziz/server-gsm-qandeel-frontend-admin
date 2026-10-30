// LedgerTab: the journal list of the Finance page with its search, type and account filters, sort, paging and the entry
// drawer. Ports ledgerTab of 45-p-finance.js. The server filters, sorts and counts; the tab only composes.
import { usePageClamp } from '@/components/ui';
import { useLedgerList } from '../hooks/useLedgerList';
import { useLedgerView } from '../hooks/useLedgerView';
import { useOpenRecord } from '../hooks/useOpenRecord';
import { hasLedgerFilters, toLedgerListFilters } from '../lib/ledgerView';
import { PAGE_SIZE } from '../lib/url';
import { JournalDrawer } from './JournalDrawer';
import { LedgerEmpty } from './LedgerEmpty';
import { LedgerTable } from './LedgerTable';
import { LedgerToolbar } from './LedgerToolbar';

export function LedgerTab() {
  const view = useLedgerView();
  const drawer = useOpenRecord('journal');
  const list = useLedgerList({
    filters: toLedgerListFilters(view.filters),
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
  });
  // A shrinking list (a filter, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });

  return (
    <>
      <LedgerToolbar
        filters={view.filters}
        onChange={view.setFilters}
        onClear={view.clearFilters}
        total={list.total}
      />
      <div className="border-t border-line">
        <LedgerTable
          rows={list.entries}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          sort={view.sort}
          onSortChange={view.setSort}
          pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.entries.length }}
          onPageChange={view.setPage}
          onOpen={(entry) => drawer.open(entry.id)}
          empty={<LedgerEmpty filtersOn={hasLedgerFilters(view.filters)} onClear={view.clearFilters} />}
        />
      </div>
      {drawer.id !== null && (
        <JournalDrawer
          key={drawer.id}
          id={drawer.id}
          row={list.entries.find((entry) => entry.id === drawer.id)}
          onClose={drawer.close}
        />
      )}
    </>
  );
}
