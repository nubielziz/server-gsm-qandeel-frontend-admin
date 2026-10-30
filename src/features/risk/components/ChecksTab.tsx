// ChecksTab: the IMEI checks tab: the strip of counts, the toolbar and the table, with the details drawer of the open check.
// Ports `tabChecks` of 54-p-risk.js. Search, filters, page, sort and the open check live in the address; the server filters,
// sorts and counts.
import { Panel, usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useImeiChecksList } from '../hooks/useImeiChecks';
import type { useRiskView } from '../hooks/useRiskView';
import { CHECK_PAGE_SIZE, hasChecksFilters, toCheckFilters } from '../lib/view';
import { CheckDrawer } from './CheckDrawer';
import { ChecksStats } from './ChecksStats';
import { ChecksTable } from './ChecksTable';
import { ChecksToolbar } from './ChecksToolbar';

export function ChecksTab({ view }: { view: ReturnType<typeof useRiskView> }) {
  const now = useNow();
  const list = useImeiChecksList({
    filters: toCheckFilters(view.checks),
    page: view.page,
    pageSize: CHECK_PAGE_SIZE,
    sort: view.sort,
  });
  // A shrinking list (a filter, an old `?page=9` link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: CHECK_PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });

  return (
    <>
      <ChecksStats />
      <Panel flush>
        <ChecksToolbar
          view={view.checks}
          onChange={view.setChecks}
          onClear={() => view.setChecks({ q: '', kind: '', result: '' })}
          total={list.total}
        />
        <div className="border-t border-line">
          <ChecksTable
            rows={list.checks}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            onRetry={() => void list.query.refetch()}
            now={now}
            sort={view.sort}
            onSortChange={view.setSort}
            pagination={{
              page: view.page,
              pageSize: CHECK_PAGE_SIZE,
              total: list.total ?? list.checks.length,
            }}
            onPageChange={view.setPage}
            onOpen={(check) => view.openCheck(check.id)}
            filtered={hasChecksFilters(view.checks)}
          />
        </div>
      </Panel>
      {view.checkId !== null && (
        <CheckDrawer
          key={view.checkId}
          id={view.checkId}
          row={list.checks.find((check) => check.id === view.checkId)}
          onClose={view.closeCheck}
        />
      )}
    </>
  );
}
