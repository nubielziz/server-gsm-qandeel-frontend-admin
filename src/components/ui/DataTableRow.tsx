// DataTableRow: one body row of DataTable with its select box, cursor mark and whole-row click (body of table()).
import { useEffect, useRef, type MouseEvent } from 'react';
import { cx } from './cx';
import { HIDE_CLASS, type DataTableColumn, type RowKey } from './dataTableTypes';
import type { RowSelection } from './useRowSelection';

// Controls inside a row keep their own click; only the empty parts of the row open the detail.
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [data-stop]';

export interface DataTableRowProps<T, K extends RowKey> {
  row: T;
  id: K;
  columns: readonly DataTableColumn<T>[];
  selection?: RowSelection<K>;
  onRowClick?: (row: T) => void;
  /** Marks the row the keyboard cursor (j/k) is on and scrolls it into view. */
  isCursor?: boolean;
}

/**
 * Rows are mouse targets only: the keyboard path to the same detail must be a link or button inside a cell,
 * as in the demo (the first cell holds the ID button). That keeps one tab stop per row.
 */
export function DataTableRow<T, K extends RowKey>({
  row,
  id,
  columns,
  selection,
  onRowClick,
  isCursor = false,
}: DataTableRowProps<T, K>) {
  const ref = useRef<HTMLTableRowElement>(null);
  const selected = selection?.has(id) ?? false;

  useEffect(() => {
    if (isCursor) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isCursor]);

  function onClick(e: MouseEvent<HTMLTableRowElement>) {
    if (!onRowClick) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    onRowClick(row);
  }

  return (
    <tr
      ref={ref}
      className={onRowClick ? 'row' : undefined}
      aria-selected={selected ? true : undefined}
      data-cursor={isCursor ? '1' : undefined}
      onClick={onClick}
    >
      {selection && (
        <td className="!pe-0">
          <input
            type="checkbox"
            className="check"
            aria-label={`Select row ${id}`}
            checked={selected}
            onChange={(e) => selection.toggle(id, e.target.checked)}
          />
        </td>
      )}
      {columns.map((col) => (
        <td key={col.key} className={cx(col.num && 'num', col.hide && HIDE_CLASS[col.hide], col.className)}>
          {col.render(row)}
        </td>
      ))}
    </tr>
  );
}
