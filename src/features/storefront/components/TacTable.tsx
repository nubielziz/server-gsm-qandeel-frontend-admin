// TacTable: the TAC catalogue table (TAC, brand, phone, year, source, Edit). The tab is new in the map; the demo kept the table
// inside its IMEI checker. It only draws what it is given; the tab owns data, sort and page.
import type { ReactNode } from 'react';
import {
  Button,
  DataTable,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import type { TacEntry } from '../types';

export interface TacTableProps {
  rows: readonly TacEntry[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  empty: ReactNode;
  /** Props for the Edit button when the staff member lacks `catalog:update`. */
  lock: { disabled: boolean; title?: string };
  onEdit: (entry: TacEntry) => void;
}

/** Draws the rows it is given. */
export function TacTable({
  rows,
  state,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  empty,
  lock,
  onEdit,
}: TacTableProps) {
  const columns: DataTableColumn<TacEntry>[] = [
    { key: 'tac', label: 'TAC', sortField: 'tac', render: (e) => <span className="mono">{e.tac}</span> },
    { key: 'brand', label: 'Brand', sortField: 'brand', render: (e) => e.brand },
    {
      key: 'model',
      label: 'Phone',
      sortField: 'model',
      render: (e) => (
        <>
          <p className="font-medium">{e.marketingName || e.model}</p>
          {e.marketingName && <p className="mono text-2xs text-ink3">{e.model}</p>}
        </>
      ),
    },
    {
      key: 'year',
      label: 'Year',
      num: true,
      hide: 'sm',
      sortField: 'releaseYear',
      render: (e) => e.releaseYear || '–',
    },
    {
      key: 'source',
      label: 'Source',
      hide: 'md',
      render: (e) => <span className="text-ink2">{e.source}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (e) => (
        <Button
          size="sm"
          disabled={lock.disabled}
          title={lock.title}
          aria-label={`Edit TAC ${e.tac}`}
          onClick={() => onEdit(e)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      caption="TAC catalogue"
      columns={columns}
      rows={rows}
      rowKey={(e) => e.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the TAC catalogue"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
