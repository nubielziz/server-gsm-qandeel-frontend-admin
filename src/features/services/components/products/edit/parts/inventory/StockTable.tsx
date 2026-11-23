// StockTable: the stored codes of one service in the list skin: the masked code, its status, the order it went to, its batch and when it
// was added. The server masks every code except its last four characters; the table shows what it is sent. Rows can be ticked.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { DataTable, type DataTableColumn, type RowSelection } from '@/components/ui';
import { orderPath } from '@/features/orders';
import { fmtDate } from '@/lib/format';
import type { InventoryCode } from '../../../../../types';
import { StockStatus } from './StockStatus';

const COLUMNS: DataTableColumn<InventoryCode>[] = [
  { key: 'code', label: 'Code', render: (code) => <span className="mono">{code.maskedCode}</span> },
  { key: 'status', label: 'Status', render: (code) => <StockStatus status={code.status} /> },
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

export interface StockTableProps {
  rows: readonly InventoryCode[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  selection: RowSelection<number>;
  empty: ReactNode;
}

/** One page of the service's codes with tick boxes (the footer pager is the part's). */
export function StockTable({ rows, state, error, onRetry, selection, empty }: StockTableProps) {
  return (
    <DataTable
      skin="list"
      footer={false}
      caption="Stored codes"
      columns={COLUMNS}
      rows={rows}
      rowKey={(code) => code.id}
      selection={selection}
      state={state}
      error={error}
      errorTitle="Could not load the codes"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
