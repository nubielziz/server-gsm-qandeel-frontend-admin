// The pieces of drag and drop that are plain data (decision 038): the screen reader's words in English, the rule that a row moves only up and
// down, and the sensors' settings. The library draws nothing; the rows and the handle are in SortableRow.
import type { Announcements, Modifier, ScreenReaderInstructions } from '@dnd-kit/core';
import type { UniqueIdentifier } from '@dnd-kit/core';

/** What the handle's description tells a screen reader user before a row is picked up. */
export const DRAG_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    'To pick up a row, press space or enter on its grip. Use the up and down arrow keys to move it, then space or enter to drop it. Press escape to cancel.',
};

/** What a row is called and where it stands in the whole list (1-based). */
export type RowInfo = { label: string; place: number };

/**
 * The live-region sentences of a drag, in English, naming the row and its place in the whole list (`count` rows, of which the page may
 * show only some). `info` finds a row by the id the library holds.
 */
export function dragAnnouncements(
  info: (id: UniqueIdentifier) => RowInfo | undefined,
  count: number,
): Announcements {
  const where = (row: RowInfo) => `position ${row.place} of ${count}`;
  return {
    onDragStart({ active }) {
      const row = info(active.id);
      return row ? `Picked up ${row.label}, ${where(row)}.` : undefined;
    },
    onDragOver({ active, over }) {
      const row = info(active.id);
      const target = over ? info(over.id) : undefined;
      if (!row || !target || over?.id === active.id) return undefined;
      return `${row.label} is over ${target.label}, ${where(target)}.`;
    },
    onDragEnd({ active, over }) {
      const row = info(active.id);
      const target = over ? info(over.id) : undefined;
      if (!row) return undefined;
      return target && over?.id !== active.id
        ? `${row.label} dropped at ${where(target)}.`
        : `${row.label} dropped where it was, ${where(row)}.`;
    },
    onDragCancel({ active }) {
      const row = info(active.id);
      return row ? `Dragging cancelled. ${row.label} is back at ${where(row)}.` : undefined;
    },
  };
}

/** A row moves up and down only, never sideways. */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** How far a pointer must move (px) before a press on the grip becomes a drag, so a plain click on it does nothing. */
export const POINTER_DISTANCE = 6;
