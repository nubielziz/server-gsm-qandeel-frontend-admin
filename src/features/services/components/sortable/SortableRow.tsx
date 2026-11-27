// SortableRow: one body row of the list skin that can be dragged by its grip (decision 038). The grip is a button in the first cell and the only
// part that starts a drag, so the rest of the row stays clickable and its text selectable. It mirrors DataTableRow's cells (the select box and
// the columns) and adds the library's transform while the row moves. Reduced motion: the row jumps, with no transition.
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cx, type DataTableColumn, type RowSelection } from '@/components/ui';
import { HIDE_CLASS } from '@/components/ui/dataTableTypes';
import { DURATION_BASE, EASE_GLIDE, prefersReducedMotion } from '@/lib/motion';

/** Six dots, the usual grip. */
function Grip() {
  return (
    <svg viewBox="0 0 16 16" className="ic-sm" aria-hidden="true" fill="currentColor">
      {[4, 8, 12].flatMap((y) => [5.5, 10.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" />))}
    </svg>
  );
}

export interface SortableRowProps<T> {
  row: T;
  id: number;
  columns: readonly DataTableColumn<T>[];
  selection?: RowSelection<number>;
  /** What the row is called, for the grip's name. */
  label: string;
  /** Why dragging is off (the grip's title), or null when it is on. */
  offReason: string | null;
}

/** The row. Needs a SortableContext above it. */
export function SortableRow<T>({ row, id, columns, selection, label, offReason }: SortableRowProps<T>) {
  const off = offReason !== null;
  const reduced = prefersReducedMotion();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      disabled: off,
      // With null the library neither moves rows with a transition nor animates the drop into place.
      transition: reduced ? null : { duration: DURATION_BASE, easing: EASE_GLIDE },
    });
  const selected = selection?.has(id) ?? false;

  return (
    <tr
      ref={setNodeRef}
      aria-selected={selected ? true : undefined}
      className={cx(isDragging && 'relative z-10 bg-surface shadow-pop')}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <td className="w-px !pe-0">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...(off ? { disabled: true } : { ...attributes, ...listeners })}
          aria-label={`Drag ${label}`}
          title={off ? offReason : 'Drag to a new place'}
          className={cx(
            'inline-flex h-7 w-6 touch-none items-center justify-center rounded text-ink3',
            off
              ? 'cursor-not-allowed opacity-40'
              : 'cursor-grab hover:bg-sunken hover:text-ink active:cursor-grabbing',
          )}
        >
          <Grip />
        </button>
      </td>
      {selection && (
        <td className="!pe-0">
          <input
            type="checkbox"
            className="check"
            aria-label={`Select row ${id}`}
            checked={selected}
            onChange={(event) => selection.toggle(id, event.target.checked)}
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
