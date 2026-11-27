// The pure rules of the Group view's list: the groups of one kind in the order merchants see them, one page of them, the page size
// kept in the address, and the position changes that move a group one place up or down (the rules of a drag are in reorder.ts). Nothing here
// reads the server.
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceCategory } from '../types';
import { dragState, reorderChanges, type DragState, type PositionChange } from './reorder';

/** Groups per page when the address names no size. */
export const GROUPS_DEFAULT_SIZE = 50;

/** The largest page size the view accepts (the whole list is read at once; the page size only cuts it for the table). */
export const GROUPS_MAX_SIZE = 200;

/** The page size an address parameter names; anything that is not a whole number from 1 to 200 is the default. */
export function parseGroupsSize(raw: string | null): number {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return GROUPS_DEFAULT_SIZE;
  const size = Number(raw);
  return size <= GROUPS_MAX_SIZE ? size : GROUPS_DEFAULT_SIZE;
}

/**
 * The groups of one kind, by position and then by id: the order merchants see, and so the order the up and down buttons move through.
 * The server lists every kind together (it has no kind filter), so the view narrows them here.
 */
export function groupsOfKind<T extends Pick<ServiceCategory, 'id' | 'type' | 'sort'>>(
  all: readonly T[],
  type: ServiceType,
): T[] {
  return all.filter((group) => group.type === type).sort((a, b) => a.sort - b.sort || a.id - b.id);
}

/** The groups whose name holds the text anywhere, ignoring case and the spaces around the text; an empty text keeps every group. */
export function groupsMatching<T extends Pick<ServiceCategory, 'name'>>(
  groups: readonly T[],
  text: string,
): T[] {
  const needle = text.trim().toLowerCase();
  return needle === '' ? [...groups] : groups.filter((group) => group.name.toLowerCase().includes(needle));
}

/** One page (1-based) of a list. A page past the end is the last page, and the page it shows is told back. */
export function pageOf<T>(items: readonly T[], page: number, size: number): { rows: T[]; page: number } {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const shown = Math.min(Math.max(1, page), pages);
  return { rows: items.slice((shown - 1) * size, shown * size), page: shown };
}

/**
 * Where a group that was just added shows: the page that holds it at this size, in the list as the search leaves it, and the search to keep.
 * A search that would hide the group is dropped (the list is then the whole kind). Null when the group is not in `ordered`.
 */
export function locateGroup(
  ordered: readonly Pick<ServiceCategory, 'id' | 'name'>[],
  id: Id,
  q: string,
  size: number,
): { page: number; q: string } | null {
  if (!ordered.some((group) => group.id === id)) return null;
  const found = groupsMatching(ordered, q);
  const hidden = !found.some((group) => group.id === id);
  const list = hidden ? ordered : found;
  return {
    page: Math.floor(list.findIndex((group) => group.id === id) / size) + 1,
    q: hidden ? '' : q.trim(),
  };
}

/**
 * The position writes that move group `id` one place up or down in `ordered` (the groups of one kind in their order), or none when it
 * is already first (up) or last (down) or not in the list. The rules of the numbers (ties, only the groups that change) are those of
 * `reorderChanges`: this is a drag over one place, which is how the up and down buttons save.
 */
export function moveChanges(
  ordered: readonly Pick<ServiceCategory, 'id' | 'sort'>[],
  id: Id,
  direction: 'up' | 'down',
): PositionChange[] {
  const from = ordered.findIndex((group) => group.id === id);
  return from < 0 ? [] : reorderChanges(ordered, from, direction === 'up' ? from - 1 : from + 1);
}

/** Where the up or down button takes a group: the indexes of the group and of the place it moves to, or null at the edge or when it is not in the list. */
export function stepIndexes(
  ordered: readonly Pick<ServiceCategory, 'id'>[],
  id: Id,
  direction: 'up' | 'down',
): { from: number; to: number } | null {
  const from = ordered.findIndex((group) => group.id === id);
  const to = direction === 'up' ? from - 1 : from + 1;
  return from < 0 || to < 0 || to >= ordered.length ? null : { from, to };
}

/**
 * Whether the rows of the Group view can be dragged. It is off for a role without `catalog:update` (`lock` is the reason the grants give),
 * while a save runs, while the server holds more groups than the list shows (`truncated`: a drop would be worked out over only some of the
 * groups) and while a search is on (the list is then only some of the groups, so a drop could not say where it lands in the whole order).
 * Every reason is also said in a line above the table, not only in the title of a disabled grip. The list is otherwise always in position
 * order: nothing in the view sorts it.
 */
export function groupDragState({
  lock,
  saving,
  searching,
  truncated,
}: {
  lock: { disabled: boolean; title?: string };
  saving: boolean;
  searching: boolean;
  truncated: boolean;
}): DragState {
  return dragState([
    { when: lock.disabled, reason: lock.title ?? 'You cannot change the order', hint: true },
    { when: saving, reason: 'Saving the new order', hint: true },
    { when: truncated, reason: 'Groups cannot be dragged while only some of them are listed', hint: true },
    { when: searching, reason: 'Clear the search to drag groups', hint: true },
  ]);
}
