// TableCards: the rows of a DataTable as stacked cards (label: value lines, actions at the foot) for ResponsiveTable on phones.
import { Fragment, type ReactNode } from 'react';
import { cx, type DataTableColumn, type RowKey } from '@/components/ui';

// Controls inside a card keep their own click; only the empty parts of the card open the detail (as in DataTableRow).
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [data-stop]';

/** A cell that renders nothing for this row (an empty last-failure text) has no line in a card: a bare label is noise. */
function isBlank(node: ReactNode): boolean {
  return node === null || node === undefined || node === false || node === '';
}

export interface TableCardsProps<T, K extends RowKey> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => K;
  onRowClick?: (row: T) => void;
  /** Key of the column shown as the card's heading. Default: the first column that has a label. */
  titleKey?: string;
  /** Accessible name of the list. */
  caption?: string;
}

/**
 * Cards are separated by hairlines, not drawn as boxes: panels are never nested. The heading column has no label;
 * every other column is a "label: value" line with the value on the right; a column with an empty label (the table's
 * actions column) goes to the foot of the card. Columns hidden by `hide` in the table are shown here: a card has room.
 */
export function TableCards<T, K extends RowKey>({
  columns,
  rows,
  rowKey,
  onRowClick,
  titleKey,
  caption,
}: TableCardsProps<T, K>) {
  const labelled = columns.filter((column) => column.label !== '');
  const actions = columns.filter((column) => column.label === '');
  const title = labelled.find((column) => column.key === titleKey) ?? labelled[0];
  const facts = labelled.filter((column) => column !== title);
  return (
    <ul aria-label={caption} className="m-0 list-none divide-y divide-line p-0">
      {rows.map((row) => (
        <li
          key={rowKey(row)}
          className={cx('px-3.5 py-3', onRowClick && 'cursor-pointer hover:bg-hover')}
          onClick={(e) => {
            if (onRowClick && !(e.target as HTMLElement).closest(INTERACTIVE)) onRowClick(row);
          }}
        >
          {title && <div className="text-sm font-medium">{title.render(row)}</div>}
          <dl className="m-0 mt-2 space-y-1.5 text-sm empty:hidden">
            {facts.map((column) => {
              const value = column.render(row);
              return isBlank(value) ? null : (
                <div key={column.key} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-ink3">{column.label}</dt>
                  <dd className={cx('m-0 min-w-0 text-end', column.num && 'tabular-nums')}>{value}</dd>
                </div>
              );
            })}
          </dl>
          {/* `empty:hidden`: when every action renders nothing (a read-only staff member), no bare hairline is left. */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 empty:hidden">
            {actions.map((column) => (
              <Fragment key={column.key}>{column.render(row)}</Fragment>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
