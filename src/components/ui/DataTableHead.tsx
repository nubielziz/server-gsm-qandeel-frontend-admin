// DataTableHead: sticky header row of DataTable with sort buttons and the select-all box (head of table() in 20-ui.js).
import { cx } from './cx';
import { HIDE_CLASS, type DataTableColumn, type RowKey, type SortState } from './dataTableTypes';
import { Icon } from './Icon';
import { IndeterminateCheckbox } from './IndeterminateCheckbox';
import type { RowSelection } from './useRowSelection';

export interface DataTableHeadProps<T, K extends RowKey> {
  columns: readonly DataTableColumn<T>[];
  /** Keys of the rows on this page: select-all only touches these. */
  pageKeys: readonly K[];
  selection?: RowSelection<K>;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
}

/**
 * A column is sortable when it has a sortField and the table has onSortChange. The first click on a column
 * sorts ascending, later clicks flip the direction; the page decides what else to reset (usually page 1).
 */
export function DataTableHead<T, K extends RowKey>({
  columns,
  pageKeys,
  selection,
  sort,
  onSortChange,
}: DataTableHeadProps<T, K>) {
  const picked = selection ? pageKeys.filter((key) => selection.has(key)).length : 0;
  const allPicked = pageKeys.length > 0 && picked === pageKeys.length;

  return (
    <thead>
      <tr>
        {selection && (
          <th className="w-9 !ps-3.5 !pe-0" scope="col">
            <IndeterminateCheckbox
              aria-label="Select all rows on this page"
              checked={allPicked}
              indeterminate={picked > 0 && !allPicked}
              onChange={(e) => selection.setMany(pageKeys, e.target.checked)}
            />
          </th>
        )}
        {columns.map((col) => {
          const field = col.sortField;
          const sortable = Boolean(field && onSortChange);
          const active = sortable && sort?.field === field;
          const ariaSort = !sortable
            ? undefined
            : active
              ? sort?.order === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none';
          return (
            <th
              key={col.key}
              scope="col"
              className={cx(col.num && 'num', col.hide && HIDE_CLASS[col.hide], col.className)}
              aria-sort={ariaSort}
            >
              {sortable && field ? (
                <button
                  type="button"
                  className={cx(
                    'inline-flex items-center gap-1 font-medium hover:text-ink',
                    col.num && 'flex-row-reverse',
                    active && 'text-ink',
                  )}
                  onClick={() =>
                    onSortChange?.({ field, order: active && sort?.order === 'asc' ? 'desc' : 'asc' })
                  }
                >
                  {col.label}
                  {active ? (
                    <Icon name={sort?.order === 'asc' ? 'arrowUp' : 'arrowDown'} className="ic-xs" />
                  ) : (
                    <Icon name="sort" className="ic-xs opacity-40" />
                  )}
                </button>
              ) : col.label ? (
                col.label
              ) : (
                <span className="sr-only">Actions</span>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
