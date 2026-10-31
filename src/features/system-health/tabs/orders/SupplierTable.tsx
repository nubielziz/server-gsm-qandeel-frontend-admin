// SupplierTable: the table of supplier health rows (badge, name, latency, error and timeout rates, circuit, last success and
// sync, balance, Pause or Resume). A ResponsiveTable: stacked cards on a phone. Suppliers card, Orders & suppliers tab.
import { useMemo } from 'react';
import type { DataTableColumn } from '@/components/ui';
import { ResponsiveTable, MeasureValue, MetaBadge } from '../../components';
import { useHealthGrants } from '../../hooks';
import { circuitMeta } from '../../lib';
import type { SupplierHealth } from '../../types';
import { ActionCell, AgoCell, BalanceCell, HealthCell, NameCell } from './SupplierCells';
import type { StatusChange } from './suppliersModel';

export interface SupplierTableProps {
  rows: readonly SupplierHealth[];
  /** The accessible name of the table. */
  caption: string;
  /** The clock of the card (epoch ms), so every "ago" in the table moves together. */
  now: number;
  /** A click on Pause or Resume: the card opens the confirm dialog for it. */
  onChange: (change: StatusChange) => void;
}

/**
 * The name comes first because on a phone it becomes the heading of each card. Columns that matter least drop out below
 * `xl` (timeout rate and the two "ago" times); a card shows all of them. The circuit never drops out: an open circuit is
 * why calls to a supplier stop, and it is the one thing the health badge does not say. Below 768px the cards take over;
 * from 768px the table has six columns. The actions column exists only for a staff member who can change something: a
 * read-only one gets no empty column.
 */
export function SupplierTable({ rows, caption, now, onChange }: SupplierTableProps) {
  const grants = useHealthGrants();
  const canOpen = grants.can('suppliers:read');
  const showActions = grants.ready && !grants.readOnly;
  const columns = useMemo(() => {
    const list: DataTableColumn<SupplierHealth>[] = [
      { key: 'name', label: 'Supplier', render: (row) => <NameCell supplier={row} canOpen={canOpen} /> },
      { key: 'health', label: 'Health', render: (row) => <HealthCell supplier={row} now={now} /> },
      {
        key: 'latency',
        label: 'Latency',
        num: true,
        render: (row) => <MeasureValue measure={row.latency} reserveIcon />,
      },
      {
        key: 'errors',
        label: 'Error rate',
        num: true,
        render: (row) => <MeasureValue measure={row.errorRate} reserveIcon />,
      },
      {
        key: 'timeouts',
        label: 'Timeout rate',
        num: true,
        hide: 'xl',
        render: (row) => <MeasureValue measure={row.timeoutRate} reserveIcon />,
      },
      { key: 'circuit', label: 'Circuit', render: (row) => <MetaBadge meta={circuitMeta(row.circuit)} /> },
      {
        key: 'success',
        label: 'Last success',
        hide: 'xl',
        render: (row) => <AgoCell at={row.lastSuccessAt} now={now} />,
      },
      {
        key: 'sync',
        label: 'Last sync',
        hide: 'xl',
        render: (row) => <AgoCell at={row.lastSyncAt} now={now} />,
      },
      { key: 'balance', label: 'Balance', num: true, render: (row) => <BalanceCell balance={row.balance} /> },
    ];
    if (showActions) {
      list.push({
        key: 'actions',
        label: '',
        render: (row) => <ActionCell supplier={row} onChange={onChange} />,
      });
    }
    return list;
  }, [canOpen, showActions, now, onChange]);

  // No "N rows" line: the card's quiet line counts the healthy suppliers that are folded away.
  return (
    <ResponsiveTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      caption={caption}
      footer={false}
    />
  );
}
