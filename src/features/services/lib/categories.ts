// Small helpers for the Group views of the Product / Services page: which ranks see a group, in words, whether two
// lists of ranks are the same, and how one rank is ticked or unticked. An empty list means every rank (the assumed reading of `allowedGroupIds`).
import type { Id } from '@/lib/api';
import type { NamedRef } from '../types';

/** "All" when no rank is named (every rank sees the group), the rank names, or a count when the names are not available. */
export function visibleToText(ids: readonly Id[], groups: readonly NamedRef[] | undefined): string {
  if (ids.length === 0) return 'All';
  if (!groups) return `${ids.length} ${ids.length === 1 ? 'rank' : 'ranks'}`;
  return ids.map((id) => groups.find((group) => group.id === id)?.name ?? `#${id}`).join(', ');
}

/** Whether two lists hold the same ids, in any order. */
export function sameIds(a: readonly Id[], b: readonly Id[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/** The ranks after one is ticked (`on`) or unticked. Ticking one that is there, or unticking one that is not, changes nothing. */
export function toggleRank(ids: readonly Id[], id: Id, on: boolean): Id[] {
  if (on) return ids.includes(id) ? [...ids] : [...ids, id];
  return ids.filter((other) => other !== id);
}
