// MerchantPaymentsTable: one page of a merchant's payments (deposits) on the Billing tab (number linking to the deposit in Finance,
// method, status, amount, created). It only draws what it is given: the tab owns the data and the page number.
import { Link } from 'react-router';
import { DataTable, EmptyState, type DataTableColumn, type PaginationState } from '@/components/ui';
import {
  financePaymentPath,
  methodLabel,
  PaymentStatusBadge,
  paymentLabel,
  type Payment,
} from '@/features/finance';
import { fmtDate, money } from '@/lib/format';
import { BILLING_PAGE_SIZE } from '../lib/billing';

export interface MerchantPaymentsTableProps {
  rows: readonly Payment[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
}

const COLUMNS: DataTableColumn<Payment>[] = [
  {
    key: 'id',
    label: 'Deposit',
    render: (payment) => (
      <Link className="link font-medium mono" to={financePaymentPath(payment.id)}>
        {paymentLabel(payment.id)}
      </Link>
    ),
  },
  { key: 'method', label: 'Method', hide: 'sm', render: (payment) => methodLabel(payment) },
  { key: 'status', label: 'Status', render: (payment) => <PaymentStatusBadge status={payment.status} /> },
  { key: 'amount', label: 'Amount', num: true, render: (payment) => money(payment.amount) },
  { key: 'created', label: 'Created', hide: 'sm', render: (payment) => fmtDate(payment.createdAt) },
];

/** Draws the payments of one merchant. */
export function MerchantPaymentsTable({
  rows,
  state,
  error,
  onRetry,
  total,
  page,
  onPageChange,
}: MerchantPaymentsTableProps) {
  const pagination: PaginationState = { page, pageSize: BILLING_PAGE_SIZE, total };
  return (
    <DataTable
      caption="Payments"
      columns={COLUMNS}
      rows={rows}
      rowKey={(payment) => payment.id}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the payments"
      onRetry={onRetry}
      empty={
        <EmptyState icon="wallet" title="No payments">
          Deposits this merchant makes show here.
        </EmptyState>
      }
    />
  );
}
