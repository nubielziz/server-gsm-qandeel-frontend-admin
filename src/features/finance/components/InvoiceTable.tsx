// InvoiceTable: the invoice list (number, billed to, kind, issued, total, status, due). New in the console (MISMATCHES M123). It only
// draws what it is given: the tab owns the data, the sort and the page.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  DataTable,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { ago, fmtDate, money } from '@/lib/format';
import { billedTo, invoiceKindLabel } from '../lib/invoices';
import type { Invoice } from '../types';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

export interface InvoiceTableProps {
  rows: readonly Invoice[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onOpen: (invoice: Invoice) => void;
  empty: ReactNode;
}

export function InvoiceTable({
  rows,
  state,
  error,
  onRetry,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onOpen,
  empty,
}: InvoiceTableProps) {
  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'number',
      label: 'Invoice',
      render: (invoice) => (
        <button type="button" className="link mono font-medium" onClick={() => onOpen(invoice)}>
          {invoice.number}
        </button>
      ),
    },
    {
      key: 'billed',
      label: 'Billed to',
      render: (invoice) => {
        const who = billedTo(invoice);
        return who.href ? (
          <Link className="link" to={who.href}>
            {who.name}
          </Link>
        ) : (
          who.name
        );
      },
    },
    {
      key: 'kind',
      label: 'Kind',
      hide: 'md',
      render: (invoice) => <TypeTag>{invoiceKindLabel(invoice.kind)}</TypeTag>,
    },
    {
      key: 'issued',
      label: 'Issued',
      sortField: 'createdAt',
      render: (invoice) => (
        <span className="whitespace-nowrap text-ink2" title={fmtDate(invoice.createdAt)}>
          {ago(invoice.createdAt, now)}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      num: true,
      sortField: 'total',
      render: (invoice) => money(invoice.total),
    },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (invoice) => <InvoiceStatusBadge status={invoice.status} />,
    },
    {
      key: 'due',
      label: 'Due',
      hide: 'lg',
      render: (invoice) =>
        invoice.dueAt ? (
          <span className="whitespace-nowrap text-ink2">{fmtDate(invoice.dueAt)}</span>
        ) : (
          <span className="text-ink3">–</span>
        ),
    },
  ];

  return (
    <DataTable
      caption="Invoices"
      columns={columns}
      rows={rows}
      rowKey={(invoice) => invoice.id}
      onRowClick={onOpen}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the invoices"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
