// DataTable: sortable, selectable, paged table with built-in loading/error/empty states. Ports table() of 20-ui.js.
import type { ReactNode } from 'react';
import type { DataTableColumn, PaginationState, RowKey, SortState } from './dataTableTypes';
import { DataTableHead } from './DataTableHead';
import { DataTableRow } from './DataTableRow';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { formatCount } from './formatCount';
import { Pager } from './Pager';
import { SkeletonTable } from './SkeletonTable';
import type { RowSelection } from './useRowSelection';

export interface DataTableProps<T, K extends RowKey = RowKey> {
  columns: readonly DataTableColumn<T>[];
  /** The rows of the current page, already sorted and filtered by the server. */
  rows: readonly T[];
  rowKey: (row: T) => K;
  /** Whole-row click (opens the detail drawer). Controls inside a cell keep their own clicks. */
  onRowClick?: (row: T) => void;
  /** From useRowSelection(); adds the checkbox column with select-all for the current page. */
  selection?: RowSelection<K>;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  /** `loading` shows a skeleton in the table's shape, `error` an ErrorState with Retry. Default `ready`. */
  state?: 'loading' | 'error' | 'ready';
  error?: unknown;
  errorTitle?: string;
  onRetry?: () => void;
  /** Shown when `ready` with no rows. Default: a generic empty block. */
  empty?: ReactNode;
  /** Accessible name of the table. */
  caption?: string;
  /** Row the keyboard cursor is on (data-cursor). */
  cursorKey?: K;
  skeletonRows?: number;
  /**
   * The "N rows" line under a list without pagination. Pass `false` when the card counts its rows itself, for
   * example a list of problems above a "12 components operational · Show" line. A pager is always drawn.
   */
  footer?: boolean;
}

/**
 * The page owns sort, page and selection (Refine's useTable keeps them in the URL); the table only reports
 * what the user asked for. Without `pagination` it is a plain list that ends with an "N rows" line (`footer`).
 */
export function DataTable<T, K extends RowKey = RowKey>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selection,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  state = 'ready',
  error,
  errorTitle,
  onRetry,
  empty,
  caption,
  cursorKey,
  skeletonRows = 8,
  footer = true,
}: DataTableProps<T, K>) {
  if (state === 'loading') {
    return <SkeletonTable cols={columns.length + (selection ? 1 : 0)} rows={skeletonRows} />;
  }
  if (state === 'error') return <ErrorState title={errorTitle} error={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Nothing to show">No rows match.</EmptyState>}</>;
  }

  const keys = rows.map(rowKey);
  const total = pagination?.total ?? rows.length;
  const paged = pagination !== undefined && total > pagination.pageSize;

  return (
    <div>
      <div className="tbl-wrap">
        <table className="tbl" aria-label={caption}>
          <DataTableHead
            columns={columns}
            pageKeys={keys}
            selection={selection}
            sort={sort}
            onSortChange={onSortChange}
          />
          <tbody>
            {rows.map((row, i) => (
              <DataTableRow
                key={keys[i]}
                row={row}
                id={keys[i]}
                columns={columns}
                selection={selection}
                onRowClick={onRowClick}
                isCursor={cursorKey !== undefined && cursorKey === keys[i]}
              />
            ))}
          </tbody>
        </table>
      </div>
      {paged ? (
        <Pager
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={total}
          onPageChange={(page) => onPageChange?.(page)}
        />
      ) : footer ? (
        <div className="border-t border-line px-3.5 py-2 text-xs text-ink3">
          {formatCount(total)} {total === 1 ? 'row' : 'rows'}
        </div>
      ) : null}
    </div>
  );
}
