// ServicesTable: the supplier's own services in the list skin, with a tick box per row (the ticks stay across pages), what each costs
// at the supplier, and whether a service of ours uses it already. The data is `GET /admin/suppliers/:id/services`.
import type { UseQueryResult } from '@tanstack/react-query';
import {
  DataTable,
  EmptyState,
  StatusSquare,
  type DataTableColumn,
  type RowSelection,
} from '@/components/ui';
import type { Id, ListResult } from '@/lib/api';
import { money } from '@/lib/format';
import type { SupplierService } from '../../types';

const COLUMNS: DataTableColumn<SupplierService>[] = [
  {
    key: 'name',
    label: 'Service Name',
    render: (item) => (
      <>
        {item.name}
        {item.remoteGroup !== '' && <span className="cell-sub">{item.remoteGroup}</span>}
      </>
    ),
  },
  {
    key: 'time',
    label: 'Time',
    hide: 'sm',
    render: (item) => <span className="text-ink2">{item.time}</span>,
  },
  { key: 'cost', label: 'Cost', num: true, render: (item) => money(item.credit) },
  {
    key: 'state',
    label: 'In console',
    render: (item) =>
      item.imported ? (
        <span className="inline-flex items-center gap-1.5 text-ink2">
          <StatusSquare tone="ok" label="In console" />
          In console
        </span>
      ) : (
        <span className="text-ink3">–</span>
      ),
  },
];

export interface ServicesTableProps {
  list: Pick<UseQueryResult<ListResult<SupplierService>>, 'isLoading' | 'isError' | 'error' | 'refetch'>;
  /** The rows of the page (already narrowed to the page's kind). */
  rows: readonly SupplierService[];
  selection: RowSelection<Id>;
  /** Whether a search or a filter is on, which changes the words of the empty state. */
  filtered: boolean;
}

/** The table without a pager: the form puts its own pager under it. */
export function ServicesTable({ list, rows, selection, filtered }: ServicesTableProps) {
  return (
    <DataTable
      skin="list"
      caption="Supplier services"
      columns={COLUMNS}
      rows={rows}
      rowKey={(item) => item.id}
      selection={selection}
      footer={false}
      state={list.isLoading ? 'loading' : list.isError ? 'error' : 'ready'}
      error={list.error}
      errorTitle="Could not load the supplier's services"
      onRetry={() => void list.refetch()}
      skeletonRows={5}
      empty={
        <EmptyState icon="inbox" title="No services found">
          {filtered
            ? 'No service matches. Change the search or the group.'
            : 'Sync the supplier to copy its service list.'}
        </EmptyState>
      }
    />
  );
}
