// The pure rules of the Group view's list: the groups of one kind in the order merchants see them, one page of them, the page size
// kept in the address, and the position changes that move a group one place up or down. Nothing here reads the server.
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceCategory } from '../types';

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

/** The new position of one group. */
export type PositionChange = { id: Id; sort: number };

/**
 * The position writes that move group `id` one place up or down in `ordered` (the groups of one kind in their order), or none when it
 * is already first (up) or last (down) or not in the list.
 *
 * The two groups take each other's place, so the numbers stay as they are. A tie (two groups with the same number, as when staff
 * typed none) cannot be told apart by a swap, so each group from the first moved place on gets a number above the one before it, and
 * the walk stops at the first group that already is. Only groups whose number changes are returned, so a move is usually two writes.
 */
export function moveChanges(
  ordered: readonly Pick<ServiceCategory, 'id' | 'sort'>[],
  id: Id,
  direction: 'up' | 'down',
): PositionChange[] {
  const from = ordered.findIndex((group) => group.id === id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ordered.length) return [];

  const next = [...ordered];
  [next[from], next[to]] = [next[to], next[from]];
  const first = Math.min(from, to);
  const last = Math.max(from, to);
  const changes: PositionChange[] = [];
  // The places keep their numbers; a group moved into a place takes that place's number, but never one a group before it already has.
  let before = first > 0 ? ordered[first - 1].sort : -1;
  for (let place = first; place < next.length; place += 1) {
    const sort = Math.max(ordered[place].sort, before + 1);
    if (place > last && sort === next[place].sort) break;
    if (sort !== next[place].sort) changes.push({ id: next[place].id, sort });
    before = sort;
  }
  return changes;
}
