// The pure rules of dragging a row to a new place (decision 038): which items change position when one is moved, the list as it looks
// after the move (shown at once, before the server has answered), the two indexes of a drop, and why dragging is off. Nothing here reads
// the server: the Group view and the Pricing view both use it, and the server's one-call routes judge the result.
import type { ApiError, Id } from '@/lib/api';

/** The new position of one item (a group or a service). */
export type PositionChange = { id: Id; sort: number };

/** One item that has a position. */
type Placed = { id: Id; sort: number };

/** A copy of the list with the item at `from` taken out and put at `to` (the other items keep their order). */
export function moveWithin<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

const inside = (length: number, index: number) => Number.isInteger(index) && index >= 0 && index < length;

/**
 * The position writes that move the item at `from` to the place `to` in `ordered` (the items in the order people see them), or none when
 * the two are the same or outside the list.
 *
 * The places keep their numbers: an item moved into a place takes that place's number. A tie (several items with the same number, as
 * when staff set none) cannot be told apart by a swap, so each item from the first changed place on gets a number above the one before
 * it, and the walk stops at the first item past the moved ones that already is. Only items whose number changes are returned, so a move
 * of one place is usually two writes and a drag over a few rows a few more. The server stores the numbers all or none.
 */
export function reorderChanges(ordered: readonly Placed[], from: number, to: number): PositionChange[] {
  if (from === to || !inside(ordered.length, from) || !inside(ordered.length, to)) return [];
  const next = moveWithin(ordered, from, to);
  const first = Math.min(from, to);
  const last = Math.max(from, to);
  const changes: PositionChange[] = [];
  let before = first > 0 ? ordered[first - 1].sort : -1;
  for (let place = first; place < next.length; place += 1) {
    const sort = Math.max(ordered[place].sort, before + 1);
    if (place > last && sort === next[place].sort) break;
    if (sort !== next[place].sort) changes.push({ id: next[place].id, sort });
    before = sort;
  }
  return changes;
}

/** The list after the move, in its new order, with the new numbers on the items that got one (what the table shows while the save runs). */
export function afterMove<T extends Placed>(ordered: readonly T[], from: number, to: number): T[] {
  const sorts = new Map(reorderChanges(ordered, from, to).map((change) => [change.id, change.sort]));
  return moveWithin(ordered, from, to).map((item) => {
    const sort = sorts.get(item.id);
    return sort === undefined ? item : { ...item, sort };
  });
}

/** Where a drop took an item: the indexes of the dragged item and of the one it was dropped on, or null when it was dropped on itself or on nothing. */
export function dropIndexes(
  ordered: readonly Pick<Placed, 'id'>[],
  activeId: Id,
  overId: Id | null | undefined,
): { from: number; to: number } | null {
  if (overId === null || overId === undefined || overId === activeId) return null;
  const from = ordered.findIndex((item) => item.id === activeId);
  const to = ordered.findIndex((item) => item.id === overId);
  return from < 0 || to < 0 ? null : { from, to };
}

/**
 * The list shown while a drop is being saved: the held order and numbers, with every other field read from the stored list (so a name or
 * a switch changed meanwhile shows). An item the stored list no longer has is dropped, and one the held list never had goes last.
 */
export function holdOver<T extends Placed>(stored: readonly T[], held: readonly T[] | null): readonly T[] {
  if (held === null) return stored;
  const byId = new Map(stored.map((item) => [item.id, item]));
  const kept = held.flatMap((item) => {
    const fresh = byId.get(item.id);
    return fresh ? [{ ...fresh, sort: item.sort } as T] : [];
  });
  const heldIds = new Set(held.map((item) => item.id));
  return [...kept, ...stored.filter((item) => !heldIds.has(item.id))];
}

/** Whether dragging is on, and when it is off why (the words of the handle's title) and whether the view says so in a line above the table. */
export type DragState = { on: true } | { on: false; reason: string; hint: boolean };

/** Dragging is on. */
export const DRAG_ON: DragState = { on: true };

/**
 * The first reason in the list that holds, as a drag state. A reason with `hint: true` is said in a line above the table as well as in the
 * title of the disabled handles (a title alone is not seen on a touch screen or by a keyboard); only a passing one (rows still loading) has no line.
 */
export function dragState(
  reasons: ReadonlyArray<{ when: boolean; reason: string; hint: boolean }>,
): DragState {
  const found = reasons.find((entry) => entry.when);
  return found ? { on: false, reason: found.reason, hint: found.hint } : DRAG_ON;
}

/**
 * The server's own words for a refused order save, for a toast: the message of each field and of the form, or its detail when it named
 * none. A 422 on `items.N.id` ("No category has the id 9.") is much clearer than the title "Check the form".
 */
export function refusalWords(error: ApiError): string {
  const messages = [...error.formErrors, ...Object.values(error.fieldErrors).flat()];
  const unique = [...new Set(messages.filter(Boolean))];
  return unique.length > 0 ? unique.join(' ') : (error.detail ?? error.title);
}
