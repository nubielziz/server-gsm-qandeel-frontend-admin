// AccrualsTable: the accruals as a table (earned, accrual, agent, referred merchant, order, revenue, rate, commission, status). Ports the
// `cols` of accrualsTab in 46-p-commissions.js. The server sorts and pages; the order number opens the order's drawer.
import type { ReactNode } from 'react';
import {
  Badge,
  DataTable,
  type DataTableColumn,
  type PaginationState,
  type RowSelection,
  type SortState,
} from '@/components/ui';
import { ago, money, pct, useNow } from '@/lib/format';
import { accrualLabel, agentName, statusBadge } from '../lib/accrual';
import type { CommissionAccrual } from '../types';

export interface AccrualsTableProps {
  rows: readonly CommissionAccrual[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  /** Adds the tick boxes; only the Ready sub-filter has them. */
  selection?: RowSelection<number>;
  empty: ReactNode;
  /** Opens an order's drawer; leave out when the staff member cannot read orders, and the number is plain text. */
  onOrder?: (orderId: number) => void;
}

/** The accruals table. */
export function AccrualsTable({
  rows,
  state,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  selection,
  empty,
  onOrder,
}: AccrualsTableProps) {
  const now = useNow();
  const columns: DataTableColumn<CommissionAccrual>[] = [
    {
      key: 'created',
      label: 'Earned',
      sortField: 'createdAt',
      render: (accrual) => <span className="whitespace-nowrap text-ink2">{ago(accrual.createdAt, now)}</span>,
    },
    {
      key: 'id',
      label: 'Accrual',
      hide: 'md',
      render: (accrual) => <span className="mono">{accrualLabel(accrual.id)}</span>,
    },
    {
      key: 'agent',
      label: 'Agent',
      render: (accrual) => <span className="font-medium">{agentName(accrual)}</span>,
    },
    {
      key: 'merchant',
      label: 'Referred merchant',
      hide: 'sm',
      render: (accrual) => accrual.merchant?.name ?? '–',
    },
    {
      key: 'order',
      label: 'Order',
      hide: 'lg',
      render: (accrual) =>
        onOrder ? (
          <button type="button" className="link mono" onClick={() => onOrder(accrual.orderId)}>
            ORD-{accrual.orderId}
          </button>
        ) : (
          <span className="mono">ORD-{accrual.orderId}</span>
        ),
    },
    {
      key: 'basis',
      label: 'Order revenue',
      num: true,
      hide: 'md',
      sortField: 'basisAmount',
      render: (accrual) => money(accrual.basisAmount),
    },
    {
      key: 'rate',
      label: 'Rate',
      num: true,
      hide: 'md',
      sortField: 'percent',
      render: (accrual) => pct(accrual.percent, 1),
    },
    {
      key: 'amount',
      label: 'Commission',
      num: true,
      sortField: 'amount',
      render: (accrual) => <span className="font-medium">{money(accrual.amount)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (accrual) => {
        const badge = statusBadge(accrual.status);
        return (
          <Badge tone={badge.tone} icon={badge.icon}>
            {badge.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <DataTable
      caption="Commission accruals"
      columns={columns}
      rows={rows}
      rowKey={(accrual) => accrual.id}
      state={state}
      error={error}
      errorTitle="Could not load the accruals"
      onRetry={onRetry}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      selection={selection}
      empty={empty}
    />
  );
}
