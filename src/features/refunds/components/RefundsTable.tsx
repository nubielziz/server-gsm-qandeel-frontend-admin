// RefundsTable: the refunds table with the demo's columns (refund and order, customer, reason, amount, status, when, actions).
// Ports the `cols` of tabRefunds in 53-p-refunds.js. It only draws what it is given: the tab owns the data, the sort and the page.
import type { ReactNode } from 'react';
import { cx, DataTable, type DataTableColumn, type PaginationState, type SortState } from '@/components/ui';
import { ago, lm, money } from '@/lib/format';
import { badgeFor, REFUND_BADGE, refundLabel } from '../lib/labels';
import { isAutomatic, refundActor, refundWhen } from '../lib/refund';
import type { Refund } from '../types';
import { CustomerLink } from './CustomerLink';
import { OrderLink } from './OrderLink';
import { StatusBadge } from './StatusBadge';

export interface RefundsTableProps {
  rows: readonly Refund[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  /** From `useNow`, so the ages move together. */
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  /** Opens an order's drawer; leave out when the staff member cannot read orders. */
  onOpenOrder?: (orderId: number) => void;
  empty: ReactNode;
  /** The buttons at the end of a row. */
  actions: (refund: Refund) => ReactNode;
}

export function RefundsTable({
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
  actions,
}: RefundsTableProps) {
  const columns: DataTableColumn<Refund>[] = [
    {
      key: 'id',
      label: 'Refund',
      sortField: 'id',
      render: (refund) => (
        <>
          <p className="mono font-medium">{refundLabel(refund.id)}</p>
          <p className="text-2xs">
            <OrderLink orderId={refund.orderId} onOpen={onOpenOrder} />
          </p>
        </>
      ),
    },
    {
      key: 'who',
      label: 'Customer',
      hide: 'md',
      render: (refund) => <CustomerLink customer={refund.customer} />,
    },
    {
      key: 'reason',
      label: 'Reason',
      hide: 'sm',
      render: (refund) => (
        <>
          <p className="max-w-[22rem] truncate text-ink2" title={refund.reason}>
            {refund.reason}
          </p>
          {refund.note && (
            <p
              className={cx(
                'max-w-[22rem] truncate text-2xs',
                refund.status === 'failed' ? 'text-crit-fg' : 'text-ink3',
              )}
              title={refund.note}
            >
              {refund.note}
            </p>
          )}
        </>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      num: true,
      sortField: 'amount',
      render: (refund) => (
        <>
          {lm(refund.amount, refund.currency, refund.fx)}
          {refund.currency !== 'USD' && <p className="text-2xs text-ink3">{money(refund.amount)}</p>}
          {refund.partial && <p className="text-2xs text-ink3">Partial</p>}
        </>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (refund) => <StatusBadge spec={badgeFor(REFUND_BADGE, refund.status)} />,
    },
    {
      key: 'created',
      label: 'When',
      hide: 'lg',
      sortField: 'createdAt',
      render: (refund) => (
        <>
          <span className="text-ink2">{ago(refundWhen(refund), now)}</span>
          <p className="text-2xs text-ink3">
            {refundActor(refund)}
            {isAutomatic(refund) ? ' (automatic)' : ''}
          </p>
        </>
      ),
    },
    { key: 'actions', label: '', render: actions },
  ];

  return (
    <DataTable
      caption="Refunds"
      columns={columns}
      rows={rows}
      rowKey={(refund) => refund.id}
      state={state}
      error={error}
      errorTitle="Could not load refunds"
      onRetry={onRetry}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      empty={empty}
    />
  );
}
