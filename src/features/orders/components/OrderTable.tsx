// OrderTable: the orders table with the demo's columns (order, buyer, service / input, status, reason, supplier, SLA, price,
// profit, menu). Ports orderCols of 41-p-orders.js. It only draws what it is given: the page owns the data, the sort, the
// page and the selection, so the same table serves the Orders page and the lists inside other pages.
import type { ReactNode } from 'react';
import {
  DataTable,
  type DataTableColumn,
  type PaginationState,
  type RowSelection,
  type SortState,
} from '@/components/ui';
import { ago, money } from '@/lib/format';
import { orderProfit } from '../lib/money';
import { orderLabel, SINGLE_STATUS_TABS, type OrderTab } from '../lib/status';
import type { Order } from '../types';
import { BuyerCell } from './BuyerCell';
import { OrderStatusBadge } from './OrderStatusBadge';
import { PriceCell } from './PriceCell';
import { ServiceCell } from './ServiceCell';
import { SlaCell } from './SlaCell';

export interface OrderTableProps {
  rows: readonly Order[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** The open tab: a tab that names one status drops the Status column, the review tab adds "Why it stopped". */
  tab?: OrderTab;
  /** From `useNow`, so the ages and SLA bars move together and a test can fix them. */
  now: number;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  selection?: RowSelection<number>;
  /** The row the keyboard cursor (j / k) is on. */
  cursorKey?: number;
  onOpen: (order: Order) => void;
  empty?: ReactNode;
  caption?: string;
  /** Leave out the Buyer column (a merchant's own page). */
  hideBuyer?: boolean;
  /** The "⋯" menu of a row; leave out for a plain list. */
  menu?: (order: Order) => ReactNode;
}

export function OrderTable({
  rows,
  state,
  error,
  onRetry,
  tab = 'all',
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  selection,
  cursorKey,
  onOpen,
  empty,
  caption = 'Orders',
  hideBuyer = false,
  menu,
}: OrderTableProps) {
  const columns: DataTableColumn<Order>[] = [
    {
      key: 'id',
      label: 'Order',
      sortField: 'createdAt',
      render: (order) => (
        <>
          <button type="button" className="link mono font-medium" onClick={() => onOpen(order)}>
            {orderLabel(order)}
          </button>
          <p className="text-2xs text-ink3">{ago(order.createdAt, now)}</p>
        </>
      ),
    },
    ...(hideBuyer
      ? []
      : [{ key: 'buyer', label: 'Buyer', render: (order: Order) => <BuyerCell order={order} /> }]),
    { key: 'service', label: 'Service / input', render: (order) => <ServiceCell order={order} /> },
    // The tab already names the status, so the column is only there on the tabs that mix states.
    ...(SINGLE_STATUS_TABS.includes(tab)
      ? []
      : [
          {
            key: 'status',
            label: 'Status',
            sortField: 'status',
            render: (order: Order) => <OrderStatusBadge order={order} showQueue />,
          },
        ]),
    ...(tab === 'review'
      ? [
          {
            key: 'reason',
            label: 'Why it stopped',
            render: (order: Order) => (
              <span className="block min-w-[220px] max-w-[300px] text-xs leading-4 text-ink2">
                {order.reviewReason ?? ''}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'supplier',
      label: 'Supplier',
      hide: 'xl',
      render: (order) => (
        <span className="block max-w-[120px] truncate text-ink2">{order.supplier?.name ?? '–'}</span>
      ),
    },
    { key: 'sla', label: 'SLA', render: (order) => <SlaCell order={order} now={now} /> },
    {
      key: 'price',
      label: 'Price',
      num: true,
      sortField: 'totalPrice',
      render: (order) => <PriceCell order={order} />,
    },
    {
      key: 'profit',
      label: 'Profit',
      num: true,
      hide: 'md',
      render: (order) => {
        const profit = orderProfit(order);
        return <span className={profit < 0 ? 'text-crit-fg' : undefined}>{money(profit)}</span>;
      },
    },
    ...(menu ? [{ key: 'more', label: '', className: 'w-10', render: (order: Order) => menu(order) }] : []),
  ];

  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={rows}
      rowKey={(order) => order.id}
      onRowClick={onOpen}
      selection={selection}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the orders"
      onRetry={onRetry}
      empty={empty}
      cursorKey={cursorKey}
    />
  );
}
