// InvoicesPart: the "Invoices" part of the record, a list: the invoices of one account, newest first, with the number linking to the invoice
// in Finance, its kind, its status as a square with a word, the total and the day. The page and its size are the part's own state; the footer
// pager is pinned. Every figure and word is the server's; the console only formats.
import { useState } from 'react';
import { Link } from 'react-router';
import {
  DataTable,
  EmptyState,
  FooterPager,
  RefreshTool,
  StatusSquare,
  usePageClamp,
  type DataTableColumn,
} from '@/components/ui';
import { financeInvoicePath, type Invoice } from '@/features/finance';
import { fmtDate, money } from '@/lib/format';
import { DEFAULT_PAGE_SIZE } from '../../lib/paths';
import type { AccountPartProps } from '../types';
import { invoiceKind, invoiceStatusLook } from './billingWords';
import { useAccountInvoices } from './useAccountInvoices';

const COLUMNS: DataTableColumn<Invoice>[] = [
  {
    key: 'number',
    label: 'Number',
    render: (invoice) => (
      <Link className="link mono font-medium" to={financeInvoicePath(invoice.id)}>
        {invoice.number}
      </Link>
    ),
  },
  { key: 'kind', label: 'Kind', hide: 'sm', render: (invoice) => invoiceKind(invoice.kind) },
  {
    key: 'status',
    label: 'Status',
    render: (invoice) => {
      const look = invoiceStatusLook(invoice.status);
      return (
        <span className="inline-flex items-center gap-1.5">
          <StatusSquare tone={look.tone} label={look.label} />
          {look.label}
        </span>
      );
    },
  },
  { key: 'total', label: 'Total', num: true, render: (invoice) => money(invoice.total) },
  { key: 'created', label: 'Created', hide: 'sm', render: (invoice) => fmtDate(invoice.createdAt) },
];

/**
 * The invoices of the account: top-up invoices, manual invoices and tax receipts. A guest has the receipts of their card orders, so the part
 * is drawn for a guest too; a login account has none until it tops up or pays by card.
 *
 * @param props.account the account whose invoices are listed.
 * @see GET /admin/invoices
 */
export function InvoicesPart({ account }: AccountPartProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const invoices = useAccountInvoices({ accountId: account.id, page, pageSize: size });
  const rows = invoices.data?.data ?? [];
  const total = invoices.data?.total;
  usePageClamp({
    page,
    pageSize: size,
    total,
    settled: invoices.isSuccess && !invoices.isPlaceholderData,
    setPage,
  });

  return (
    <div className="view-frame">
      <div>
        <RefreshTool onRefresh={() => void invoices.refetch()} busy={invoices.isFetching} />
        <DataTable
          skin="list"
          footer={false}
          caption="Invoices"
          columns={COLUMNS}
          rows={rows}
          rowKey={(invoice) => invoice.id}
          state={invoices.isLoading ? 'loading' : invoices.isError ? 'error' : 'ready'}
          error={invoices.error}
          errorTitle="Could not load the invoices"
          onRetry={() => void invoices.refetch()}
          empty={
            <EmptyState icon="receipt" title="No invoices for this account">
              Top-up invoices, manual invoices and tax receipts show here.
            </EmptyState>
          }
        />
      </div>
      <FooterPager
        page={page}
        pageSize={size}
        total={total ?? rows.length}
        onPage={setPage}
        onPageSize={(next) => {
          setSize(next);
          setPage(1);
        }}
      />
    </div>
  );
}
