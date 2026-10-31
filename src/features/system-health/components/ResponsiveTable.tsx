// ResponsiveTable: a DataTable from the `md` breakpoint up, the same rows as stacked cards below it. Wide tables of every
// System health tab use it, so a phone never scrolls sideways. No demo screen (design: "Mobile").
import { DataTable, Pager, type DataTableProps, type RowKey } from '@/components/ui';
import { num } from '@/lib/format';
import { useCompactScreen } from '../lib';
import { TableCards } from './TableCards';

export interface ResponsiveTableProps<T, K extends RowKey = RowKey> extends DataTableProps<T, K> {
  /** `auto` follows the screen width. `table` or `cards` forces one layout (tests, or a table that is always narrow). */
  layout?: 'auto' | 'table' | 'cards';
  /** Key of the column that becomes the card heading. Default: the first labelled column, so put the name first. */
  cardTitle?: string;
}

/**
 * The table keeps everything DataTable does. Cards show the rows, the row click and the pager; they leave out sorting
 * and selection (a phone has no column headers to click), and the server's order stays. Loading, error and empty
 * states come from DataTable in both layouts.
 */
export function ResponsiveTable<T, K extends RowKey = RowKey>({
  layout = 'auto',
  cardTitle,
  ...table
}: ResponsiveTableProps<T, K>) {
  const compact = useCompactScreen();
  const cards = layout === 'cards' || (layout === 'auto' && compact);
  const { pagination, onPageChange, rows } = table;
  if (!cards || table.state === 'loading' || table.state === 'error' || rows.length === 0) {
    return <DataTable {...table} />;
  }
  const total = pagination?.total ?? rows.length;
  return (
    <div>
      <TableCards
        columns={table.columns}
        rows={rows}
        rowKey={table.rowKey}
        onRowClick={table.onRowClick}
        titleKey={cardTitle}
        caption={table.caption}
      />
      {pagination && total > pagination.pageSize ? (
        <Pager
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={total}
          onPageChange={(page) => onPageChange?.(page)}
        />
      ) : (
        <div className="border-t border-line px-3.5 py-2 text-xs text-ink3">
          {num(total)} {total === 1 ? 'row' : 'rows'}
        </div>
      )}
    </div>
  );
}
