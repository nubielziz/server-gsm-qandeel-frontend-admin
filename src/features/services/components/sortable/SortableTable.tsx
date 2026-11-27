// SortableTable: the list-skin table of the Product / Services views with rows that can be dragged to a new place (decision 038). With no
// `drag` prop, or while the table loads, fails or is empty, it is the shared DataTable. Otherwise it draws the same table with a grip in the
// first cell of every row, inside one DndContext (pointer and keyboard sensors, the vertical axis only, English screen reader words), and
// reports a drop as "this row was dropped on that one"; what the drop means is for the view.
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMemo } from 'react';
import { DataTable, IndeterminateCheckbox, type DataTableProps } from '@/components/ui';
import { HIDE_CLASS } from '@/components/ui/dataTableTypes';
import { cx } from '@/components/ui';
import {
  DRAG_INSTRUCTIONS,
  POINTER_DISTANCE,
  dragAnnouncements,
  restrictToVerticalAxis,
} from './dragSupport';
import { SortableRow } from './SortableRow';

/** How a view lets its rows be dragged. */
export interface DragProps<T> {
  /** Why dragging is off (the grips are disabled, with this as their title), or null when it is on. */
  offReason: string | null;
  /** What a row is called. */
  labelOf: (row: T) => string;
  /** The 1-based place of a row in the whole list (the table may show one page of it). */
  placeOf: (row: T) => number;
  /** How many rows the whole list has. */
  count: number;
  /** A row was dropped on another row; the keys are those of `rowKey`. */
  onDrop: (activeKey: number, overKey: number) => void;
}

export type SortableTableProps<T> = Pick<
  DataTableProps<T, number>,
  | 'columns'
  | 'rows'
  | 'rowKey'
  | 'selection'
  | 'state'
  | 'error'
  | 'errorTitle'
  | 'onRetry'
  | 'empty'
  | 'caption'
  | 'skin'
> & { drag?: DragProps<T> };

/** The table. It never draws an "N rows" line: the views have their own pager. */
export function SortableTable<T>(props: SortableTableProps<T>) {
  const { drag, ...table } = props;
  if (!drag || (table.state ?? 'ready') !== 'ready' || table.rows.length === 0) {
    return <DataTable<T, number> {...table} footer={false} />;
  }
  return <DraggableTable {...table} drag={drag} />;
}

function DraggableTable<T>({
  columns,
  rows,
  rowKey,
  selection,
  caption,
  skin,
  drag,
}: SortableTableProps<T> & { drag: DragProps<T> }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: POINTER_DISTANCE } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const keys = rows.map(rowKey);
  const announcements = useMemo(
    () =>
      dragAnnouncements((id) => {
        const row = rows.find((candidate) => rowKey(candidate) === id);
        return row ? { label: drag.labelOf(row), place: drag.placeOf(row) } : undefined;
      }, drag.count),
    [rows, rowKey, drag],
  );
  const picked = selection ? keys.filter((key) => selection.has(key)).length : 0;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && over.id !== active.id) drag.onDrop(Number(active.id), Number(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
      accessibility={{ announcements, screenReaderInstructions: DRAG_INSTRUCTIONS }}
    >
      <div>
        <div className="tbl-wrap">
          <table className={skin === 'list' ? 'tbl tbl-list' : 'tbl'} aria-label={caption}>
            <thead>
              <tr>
                <th scope="col" className="w-px !pe-0">
                  <span className="sr-only">Drag to reorder</span>
                </th>
                {selection && (
                  <th className="w-9 !ps-3.5 !pe-0" scope="col">
                    <IndeterminateCheckbox
                      aria-label="Select all rows on this page"
                      checked={keys.length > 0 && picked === keys.length}
                      indeterminate={picked > 0 && picked < keys.length}
                      onChange={(event) => selection.setMany(keys, event.target.checked)}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cx(col.num && 'num', col.hide && HIDE_CLASS[col.hide], col.className)}
                  >
                    {col.label || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <SortableContext items={keys} strategy={verticalListSortingStrategy}>
              <tbody>
                {rows.map((row, index) => (
                  <SortableRow
                    key={keys[index]}
                    row={row}
                    id={keys[index]}
                    columns={columns}
                    selection={selection}
                    label={drag.labelOf(row)}
                    offReason={drag.offReason}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </div>
      </div>
    </DndContext>
  );
}
