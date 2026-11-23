// ServiceTable: the Catalog table. It only draws what it is given: the figures (floor, margin, below floor, shop price, attention) come
// from the server, and the tab owns data, sort, page and selection. The shop columns show only when the rows carry their keys, which
// the server sends only to a role that may read them. Ports the table of servicesTab in 43-p-services.js; columns in table/columns.tsx.
import type { ReactNode } from 'react';
import { DataTable, type PaginationState, type RowSelection, type SortState } from '@/components/ui';
import { rowsCarry } from '../lib/catalogRows';
import type { Service } from '../types';
import { catalogColumns, type CatalogColumnsArgs } from './table/columns';

export interface ServiceTableProps extends Omit<CatalogColumnsArgs, 'shopPrice' | 'onShop'> {
  rows: readonly Service[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  selection: RowSelection<number>;
  empty: ReactNode;
}

/** Draws the rows it is given. */
export function ServiceTable({
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
  ...columns
}: ServiceTableProps) {
  return (
    <DataTable
      caption="Services"
      columns={catalogColumns({
        ...columns,
        shopPrice: rowsCarry(rows, 'retailPrice'),
        onShop: rowsCarry(rows, 'listingId'),
      })}
      rows={rows}
      rowKey={(s) => s.id}
      selection={selection}
      sort={sort}
      onSortChange={onSortChange}
      cursorKey={columns.openId}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the services"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
