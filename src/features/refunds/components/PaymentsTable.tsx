// PaymentsTable: the storefront payments table (order, customer, method, paid, fee, payment status, when). Ports the `cols` of
// tabPayments in 53-p-refunds.js. It only draws what it is given: the tab owns the data, the sort and the page.
import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn, type PaginationState, type SortState } from '@/components/ui';
import { ago, lm, money } from '@/lib/format';
import { badgeFor, METHOD_LABEL, PAYMENT_BADGE } from '../lib/labels';
import type { PaymentLine } from '../types';
import { CustomerLink } from './CustomerLink';
import { OrderLink } from './OrderLink';
import { StatusBadge } from './StatusBadge';

export interface PaymentsTableProps {
  rows: readonly PaymentLine[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  /** Opens an order's drawer; leave out when the staff member cannot read orders. */
  onOpenOrder?: (orderId: number) => void;
  empty: ReactNode;
}

export function PaymentsTable({
  rows,
  state,
  error,
  onRetry,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onOpenOrder,
  empty,
}: PaymentsTableProps) {
  const columns: DataTableColumn<PaymentLine>[] = [
    {
      key: 'order',
      label: 'Order',
      sortField: 'orderId',
      render: (payment) => <OrderLink orderId={payment.orderId} onOpen={onOpenOrder} />,
    },
    {
      key: 'who',
      label: 'Customer',
      hide: 'md',
      render: (payment) => <CustomerLink customer={payment.customer} />,
    },
    {
      key: 'method',
      label: 'Method',
      hide: 'sm',
      sortField: 'method',
      render: (payment) => (
        <>
          <span className="text-ink2">{METHOD_LABEL[payment.method] ?? payment.method}</span>
          <p className="text-2xs text-ink3">{payment.brand}</p>
        </>
      ),
    },
    {
      key: 'paid',
      label: 'Paid',
      num: true,
      sortField: 'amount',
      render: (payment) => (
        <>
          {lm(payment.amount, payment.currency, payment.fx)}
          {payment.currency !== 'USD' && <p className="text-2xs text-ink3">{money(payment.amount)}</p>}
        </>
      ),
    },
    {
      key: 'fee',
      label: 'Fee',
      num: true,
      hide: 'lg',
      sortField: 'feeAmount',
      render: (payment) => money(payment.feeAmount),
    },
    {
      key: 'status',
      label: 'Payment',
      sortField: 'status',
      // An empty or unknown status reads as paid, as the demo's `chargeBadge` does.
      render: (payment) => <StatusBadge spec={badgeFor(PAYMENT_BADGE, payment.status, 'captured')} />,
    },
    {
      key: 'created',
      label: 'When',
      hide: 'sm',
      sortField: 'createdAt',
      render: (payment) => <span className="text-ink2">{ago(payment.createdAt, now)}</span>,
    },
  ];

  return (
    <DataTable
      caption="Storefront payments"
      columns={columns}
      rows={rows}
      rowKey={(payment) => payment.id}
      state={state}
      error={error}
      errorTitle="Could not load payments"
      onRetry={onRetry}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      empty={empty}
    />
  );
}
