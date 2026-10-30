// Small helpers for the Categories tab: which merchant groups can see a category, in words, and whether two lists of groups are the
// same. An empty list means every group (the assumed reading of `allowedGroupIds`, logged in HANDOFF).
import type { Id } from '@/lib/api';
import type { NamedRef } from '../types';

/** "All groups", the group names, or a count when the names are not available. */
export function visibleToText(ids: readonly Id[], groups: readonly NamedRef[] | undefined): string {
  if (ids.length === 0) return 'All groups';
  if (!groups) return `${ids.length} ${ids.length === 1 ? 'group' : 'groups'}`;
  return ids.map((id) => groups.find((group) => group.id === id)?.name ?? `#${id}`).join(', ');
}

/** Whether two lists hold the same ids, in any order. */
export function sameIds(a: readonly Id[], b: readonly Id[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
