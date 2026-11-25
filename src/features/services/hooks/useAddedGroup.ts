// useAddedGroup: what the Group view does with `group=<id>` in its address, which Add Group leaves after it makes a group. Once the list has
// loaded, it opens the page that holds the new group (without the search that would hide it), drops `group` from the address and marks
// the group for a moment, so a group added at the end of a long list is not lost.
import { useEffect, useState } from 'react';
import { locateGroup } from '../lib/groupList';
import type { ServiceCategory } from '../types';
import type { useGroupsAddress } from './useGroupsAddress';

/** How long the new group stays marked. */
export const ADDED_MARK_MS = 4000;

type Address = Pick<ReturnType<typeof useGroupsAddress>, 'added' | 'page' | 'size' | 'q' | 'land'>;

/**
 * Opens the page of the group the address names and returns that group while it is marked (null otherwise).
 * @param ordered the groups of the kind on the strip, in order (the same list the table pages)
 * @param settled the list has answered and is not being read again: before that the group may not be in it yet
 */
export function useAddedGroup(
  { added, page, size, q, land }: Address,
  ordered: readonly ServiceCategory[],
  settled: boolean,
): Pick<ServiceCategory, 'id' | 'name'> | null {
  const [marked, setMarked] = useState<Pick<ServiceCategory, 'id' | 'name'> | null>(null);

  useEffect(() => {
    if (added === null || !settled) return;
    const spot = locateGroup(ordered, added, q, size);
    const group = ordered.find((candidate) => candidate.id === added);
    if (spot && group) setMarked({ id: group.id, name: group.name });
    // A group the list does not hold (deleted since, or past the server's page) only loses the key.
    land(spot ?? { page, q });
  }, [added, settled, ordered, page, size, q, land]);

  useEffect(() => {
    if (marked === null) return;
    const timer = setTimeout(() => setMarked(null), ADDED_MARK_MS);
    return () => clearTimeout(timer);
  }, [marked]);

  return marked;
}
