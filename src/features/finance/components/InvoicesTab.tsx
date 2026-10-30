// InvoicesTab: the invoice list of the Finance page with its search and filters, sort, paging, the invoice drawer and the
// Issue manual invoice dialog. New in the console (MISMATCHES M123). The server filters, sorts and counts; the tab only composes.
import { useState } from 'react';
import { usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import type { FinanceGrants } from '../hooks/useFinanceGrants';
import { useInvoicesList } from '../hooks/useInvoicesList';
import { useInvoiceView } from '../hooks/useInvoiceView';
import { useOpenRecord } from '../hooks/useOpenRecord';
import { hasInvoiceFilters, toInvoiceListFilters } from '../lib/invoiceView';
import { PAGE_SIZE } from '../lib/url';
import { InvoiceDrawer } from './InvoiceDrawer';
import { InvoicesEmpty } from './InvoicesEmpty';
import { InvoiceTable } from './InvoiceTable';
import { InvoicesToolbar } from './InvoicesToolbar';
import { IssueInvoiceDialog } from './IssueInvoiceDialog';

export function InvoicesTab({ grants }: { grants: FinanceGrants }) {
  const view = useInvoiceView();
  const drawer = useOpenRecord('invoice');
  const now = useNow();
  const [issuing, setIssuing] = useState(false);
  const list = useInvoicesList({
    filters: toInvoiceListFilters(view.filters),
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

  // Issuing needs `invoices:create`, and the merchant picker needs `clients:read` to list who can be billed.
  const issue = grants.can('invoices:create')
    ? grants.needs('clients:read')
    : grants.needs('invoices:create');

  return (
    <>
      <InvoicesToolbar
        filters={view.filters}
        onChange={view.setFilters}
        onClear={view.clearFilters}
        total={list.total}
        issue={issue}
        onIssue={() => setIssuing(true)}
      />
      <div className="border-t border-line">
        <InvoiceTable
          rows={list.invoices}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          now={now}
          sort={view.sort}
          onSortChange={view.setSort}
          pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.invoices.length }}
          onPageChange={view.setPage}
          onOpen={(invoice) => drawer.open(invoice.id)}
          empty={<InvoicesEmpty filtersOn={hasInvoiceFilters(view.filters)} onClear={view.clearFilters} />}
        />
      </div>
      {drawer.id !== null && (
        <InvoiceDrawer
          key={drawer.id}
          id={drawer.id}
          row={list.invoices.find((invoice) => invoice.id === drawer.id)}
          grants={grants}
          onClose={drawer.close}
        />
      )}
      {issuing && <IssueInvoiceDialog onClose={() => setIssuing(false)} />}
    </>
  );
}
