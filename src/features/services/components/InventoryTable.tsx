// InventoryTable: the stock of codes: the masked code, its service, status, the order it went to, its batch and when it was added.
// The server masks every code except its last four characters; the table shows what it is sent. Rows can be ticked, to void the
// unsold ones.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { DataTable, type DataTableColumn, type PaginationState, type RowSelection } from '@/components/ui';
import { orderPath } from '@/features/orders';
import { fmtDate } from '@/lib/format';
import type { InventoryCode } from '../types';
import { InventoryStatusBadge } from './InventoryStatusBadge';

const COLUMNS: DataTableColumn<InventoryCode>[] = [
  { key: 'code', label: 'Code', render: (code) => <span className="mono">{code.maskedCode}</span> },
  {
    key: 'service',
    label: 'Service',
    render: (code) => <span className="block max-w-[260px] truncate">{code.service.name}</span>,
  },
  { key: 'status', label: 'Status', render: (code) => <InventoryStatusBadge status={code.status} /> },
  {
    key: 'order',
    label: 'Order',
    hide: 'sm',
    render: (code) =>
      code.orderId === null ? (
        <span className="text-ink3">–</span>
      ) : (
        <Link className="link mono" to={orderPath(code.orderId)}>
          #{code.orderId}
        </Link>
      ),
  },
  {
    key: 'batch',
    label: 'Batch',
    hide: 'md',
    render: (code) => <span className="mono text-xs text-ink2">{code.batchRef || '–'}</span>,
  },
  {
    key: 'added',
    label: 'Added',
    hide: 'lg',
    render: (code) => <span className="text-ink2">{fmtDate(code.createdAt)}</span>,
  },
];

export interface InventoryTableProps {
  rows: readonly InventoryCode[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  selection: RowSelection<number>;
  empty: ReactNode;
}

/** Draws one page of stock codes with tick boxes. */
export function InventoryTable({
  rows,
  state,
  error,
  onRetry,
  pagination,
  onPageChange,
  selection,
  empty,
}: InventoryTableProps) {
  return (
    <DataTable
      caption="Code inventory"
      columns={COLUMNS}
      rows={rows}
      rowKey={(code) => code.id}
      selection={selection}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the codes"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
