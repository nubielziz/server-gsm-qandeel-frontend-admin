// The "Select all not imported" box of the import picker: how many services of the supplier are not imported yet (for the
// search and the group on screen), and one click that picks all of them, also the ones on the other pages of the table. The
// picker's table is paged, so the ids come from reading the same list route in pages of 500.
import { useOnError } from '@refinedev/core';
import { isCancelledError, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { errorText, type RowSelection } from '@/components/ui';
import { isApiError, type Id } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { listSupplierServices } from '../api';
import type { QuickAddGroupRef } from '../types';
import { SUPPLIER_CATALOGUE_KEY } from './keys';
import { useSupplierCatalogue } from './useSupplierCatalogue';

/** Rows per call of the id read (the list route sends at most 1000 per call). */
export const ID_PAGE_SIZE = 500;

/** How long the ids read for a search and group count as fresh: a click inside this time does not read them again. */
const IDS_FRESH_MS = 60_000;

/**
 * Up to this many services the box reads their ids by itself, as soon as something is picked, to know whether all, some or none
 * of them are picked. Above it only a click reads them (until then the box shows "some" while something is picked).
 */
export const STATE_READ_LIMIT = 5000;

/** The search and the group the picker shows: the box acts on exactly these. */
export type ServiceFilter = { q: string; group?: QuickAddGroupRef };

/**
 * The ids of every service of the supplier that is not imported yet and matches the filter, in the picker's order (name,
 * ascending), read in pages of 500 until the server's `total` is reached. A cancelled `signal` ends the read with an error.
 */
export async function readNotImportedIds(
  supplierId: Id,
  { q, group }: ServiceFilter,
  signal?: AbortSignal,
): Promise<Id[]> {
  const ids = new Set<Id>();
  let start = 0;
  for (;;) {
    const page = await listSupplierServices(
      supplierId,
      {
        start,
        end: start + ID_PAGE_SIZE,
        q,
        sort: ['name'],
        order: ['asc'],
        filters: { imported: false, ...(group ? { remoteGroup: group.remoteGroup, type: group.type } : {}) },
      },
      { signal },
    );
    for (const row of page.data) ids.add(row.id);
    // Moves on by what came back, so a server that sends fewer rows than asked for loses none.
    start += page.data.length;
    if (page.data.length === 0 || start >= page.total) return [...ids];
  }
}

/** Whether all, some or none of the services the box stands for are picked. */
export type SelectAllState = 'none' | 'some' | 'all';

/** What the "Select all not imported" box needs: the count, its three-state value, the busy flag and the action. */
export interface SelectAllNotImported {
  /** How many services are not imported yet for the search and group; undefined until the server has said. */
  total: number | undefined;
  state: SelectAllState;
  /** The ids are being read: the box shows "Selecting…". */
  busy: boolean;
  /** Reads the ids and picks them all (`on`), or takes exactly them out of the picks. Does nothing while busy. */
  toggle: (on: boolean) => Promise<void>;
}

/** Which supplier and which search and group the box stands for, the dialog's picks and where a failed read is shown. */
export interface SelectAllArgs extends ServiceFilter {
  supplierId: Id;
  selection: RowSelection<Id>;
  /** Gets the text of a failed read, and null when a read starts, so the dialog's error slot follows. */
  onError: (text: string | null) => void;
}

/**
 * The state of the box for the filter on screen. N is the server's total of the not-imported services (a one-row page). The ids
 * of those services are read on a click, and kept per filter (also read ahead, once something is picked, while there are no more
 * than 5,000), so the state (all, some, none) is worked out from them. Changing the search or the group, or closing the dialog,
 * cancels a read that is going: nothing is picked from a cancelled read.
 */
export function useSelectAllNotImported({
  supplierId,
  q,
  group,
  selection,
  onError,
}: SelectAllArgs): SelectAllNotImported {
  const queryClient = useQueryClient();
  const { mutate: checkError } = useOnError();
  const [reading, setReading] = useState<string | null>(null);
  const counted = useSupplierCatalogue({ supplierId, page: 1, pageSize: 1, q, onlyNew: true, group });
  // The previous filter's total stays on screen while the new one loads; the box does not show it.
  const total = counted.isPlaceholderData ? undefined : counted.data?.total;

  const filter = useMemo<ServiceFilter>(() => ({ q, group }), [q, group]);
  const queryKey = useMemo(
    () => [...SUPPLIER_CATALOGUE_KEY, 'ids', supplierId, filter] as const,
    [supplierId, filter],
  );
  const picked = selection.selected.size;
  // Changing the search or the group, or closing the dialog, takes this observer off the key: React Query then cancels a read of the
  // key that is still going (its signal is the one `readNotImportedIds` hands to fetch), so the read picks nothing.
  const readIds = ({ signal }: { signal: AbortSignal }) => readNotImportedIds(supplierId, filter, signal);
  const known = useApiQuery({
    queryKey,
    queryFn: readIds,
    enabled: picked > 0 && total !== undefined && total > 0 && total <= STATE_READ_LIMIT,
    staleTime: IDS_FRESH_MS,
  });

  // The app keeps the previous answer on screen while a new key loads; the ids of another filter must not count here.
  const ids = known.isPlaceholderData ? undefined : known.data;
  const inFilter = ids?.filter((id) => selection.has(id)).length;
  let state: SelectAllState = 'some';
  if (picked === 0 || total === 0 || ids?.length === 0 || inFilter === 0) state = 'none';
  else if (ids && inFilter === ids.length) state = 'all';

  const readKey = JSON.stringify(queryKey);
  // The key on screen. React Query cancels a read when the observer leaves its key, but with `revert` it then answers with the
  // key's older cached ids instead of failing, so a read counts only while its key is still the one shown.
  const shownKey = useRef<string | null>(null);
  useEffect(() => {
    shownKey.current = readKey;
    return () => {
      shownKey.current = null;
    };
  }, [readKey]);
  async function toggle(on: boolean) {
    if (reading === readKey) return;
    onError(null);
    setReading(readKey);
    try {
      const found = await queryClient.fetchQuery({
        queryKey,
        queryFn: readIds,
        staleTime: IDS_FRESH_MS,
        // A failed read is told at once, not tried again behind the box's back.
        retry: false,
      });
      // The search or group changed (or the dialog closed) while it read: the ids are those of another filter, pick nothing.
      if (shownKey.current !== readKey) return;
      selection.setMany(found, on);
    } catch (failure) {
      // Cancelled by a changed filter or a closed dialog, or a late failure of a superseded read: nothing is picked or said.
      if (isCancelledError(failure) || shownKey.current !== readKey) return;
      if (isApiError(failure)) checkError(failure);
      onError(errorText(failure));
    } finally {
      setReading((current) => (current === readKey ? null : current));
    }
  }

  return { total, state, busy: reading === readKey, toggle };
}
