// MerchantInvoicesTable: one page of a merchant's invoices on the Billing tab (number linking to the Invoices tab of Finance, kind,
// status, total, created). It only draws what it is given: the tab owns the data and the page number.
import { Link } from 'react-router';
import { Badge, DataTable, EmptyState, type DataTableColumn, type PaginationState } from '@/components/ui';
import { financeInvoicePath, type Invoice } from '@/features/finance';
import { fmtDate, money } from '@/lib/format';
import { BILLING_PAGE_SIZE, invoiceKind, invoiceStatusLook } from '../lib/billing';

export interface MerchantInvoicesTableProps {
  rows: readonly Invoice[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
}

const COLUMNS: DataTableColumn<Invoice>[] = [
  {
    key: 'number',
    label: 'Invoice',
    render: (invoice) => (
      <Link className="link font-medium mono" to={financeInvoicePath(invoice.id)}>
        {invoice.number}
      </Link>
    ),
  },
  { key: 'kind', label: 'Type', hide: 'sm', render: (invoice) => invoiceKind(invoice.kind) },
  {
    key: 'status',
    label: 'Status',
    render: (invoice) => {
      const look = invoiceStatusLook(invoice.status);
      return (
        <Badge tone={look.tone} icon={look.icon}>
          {look.label}
        </Badge>
      );
    },
  },
  { key: 'total', label: 'Total', num: true, render: (invoice) => money(invoice.total) },
  { key: 'created', label: 'Created', hide: 'sm', render: (invoice) => fmtDate(invoice.createdAt) },
];

/** Draws the invoices of one merchant. */
export function MerchantInvoicesTable({
  rows,
  state,
  error,
  onRetry,
  total,
  page,
  onPageChange,
}: MerchantInvoicesTableProps) {
  const pagination: PaginationState = { page, pageSize: BILLING_PAGE_SIZE, total };
  return (
    <DataTable
      caption="Invoices"
      columns={COLUMNS}
      rows={rows}
      rowKey={(invoice) => invoice.id}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the invoices"
      onRetry={onRetry}
      empty={
        <EmptyState icon="receipt" title="No invoices">
          Top-up invoices and manual invoices for this merchant show here.
        </EmptyState>
      }
    />
  );
}
