// Types and shared constants of DataTable (decision 009): columns, sort and pagination as plain data owned by the page.
import type { ReactNode } from 'react';

export type RowKey = string | number;

export type SortOrder = 'asc' | 'desc';

/** What the API is asked for: the `sortField` of a column and a direction (simple-rest `_sort` / `_order`). */
export interface SortState {
  field: string;
  order: SortOrder;
}

/** Lowest breakpoint at which a column is shown; below it the column is hidden (responsive table). */
export type HideBelow = 'sm' | 'md' | 'lg' | 'xl';

// Full class names so Tailwind can see them.
export const HIDE_CLASS: Record<HideBelow, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export interface DataTableColumn<T> {
  /** Stable id of the column (React key). */
  key: string;
  /** Header text. An empty label becomes a screen-reader-only "Actions" header. */
  label: string;
  render: (row: T) => ReactNode;
  /** Makes the header a sort button and names the field sent to onSortChange. */
  sortField?: string;
  /** Right-aligned, tabular numerals. */
  num?: boolean;
  hide?: HideBelow;
  className?: string;
}

/** `total` is the size of the whole result on the server, `rows` is only the current page. */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
