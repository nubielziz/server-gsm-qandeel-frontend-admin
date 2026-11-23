// Quick add's hooks: the supplier's service groups (with its newest run), the start, and the run followed while it goes on in the
// background. A finished run makes the reads it changed stale and raises one toast. The dialog shows a failed start itself, so
// the start hook toasts no error.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui';
import type { Id } from '@/lib/api';
import { CATALOG_ROWS_KEY, useApiMutation, useApiQuery } from '@/lib/query';
import { getQuickAddRun, listServiceGroups, startQuickAdd } from '../api';
import { isLive, RUN_POLL_MS, servicesText } from '../lib/quickAdd';
import type { QuickAddBody, QuickAddRun } from '../types';
import {
  staleSupplier,
  SUPPLIER_CATALOGUE_KEY,
  SUPPLIER_GROUPS_KEY,
  SUPPLIER_QUICK_ADD_KEY,
  SUPPLIER_STALE_KEYS,
} from './keys';

const NO_ERROR_TOAST = () => false as const;

/**
 * The supplier's service groups with their counts, and its newest run. Counts move whenever anything is imported, so they are
 * read again each time a dialog opens (the app's default is to read a stale answer again on mount).
 */
export function useServiceGroups(supplierId: Id | undefined, enabled = true) {
  return useApiQuery({
    queryKey: [...SUPPLIER_GROUPS_KEY, supplierId],
    queryFn: ({ signal }) => listServiceGroups(supplierId as Id, { signal }),
    enabled: enabled && supplierId !== undefined,
  });
}

/** Starts a quick add. The answer is the queued run; the work goes on in the background. */
export function useStartQuickAdd(supplierId: Id) {
  return useApiMutation({
    mutationFn: (body: QuickAddBody) => startQuickAdd(supplierId, body),
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Follows a run: reads it again every 1.5 seconds while it is `queued` or `running`, and not once it has finished. `tracked` is
 * the run as it is known now (the start's answer, or the newest run of the groups listing) and is shown until the first read
 * arrives. When a run that was live finishes here, the supplier's lists, the Catalog table, the groups and the dashboard figures
 * are made stale, and a finished run toasts how many services it added.
 */
export function useQuickAddRun(supplier: { id: Id; name: string }, tracked: QuickAddRun | null) {
  const runId = tracked?.id ?? null;
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  // The runs seen live by this dialog: only those that finish while it watches raise the refresh and the toast.
  const seenLive = useRef(new Set<Id>());

  const query = useApiQuery({
    queryKey: [...SUPPLIER_QUICK_ADD_KEY, supplier.id, runId],
    queryFn: ({ signal }) => getQuickAddRun(supplier.id, runId as Id, { signal }),
    enabled: runId !== null,
    placeholderData: tracked ?? undefined,
    refetchInterval: (read) => (read.state.data && isLive(read.state.data) ? RUN_POLL_MS : false),
  });
  const run = query.data ?? tracked ?? undefined;

  useEffect(() => {
    if (!run) return;
    if (isLive(run)) {
      seenLive.current.add(run.id);
      return;
    }
    if (!seenLive.current.delete(run.id)) return;
    void Promise.all([
      ...staleSupplier(supplier.id).map((target) =>
        invalidate({ resource: target.resource, id: target.id, invalidates: ['list', 'many', 'detail'] }),
      ),
      invalidate({ resource: 'services', invalidates: ['list', 'many', 'detail'] }),
      // The Catalog table's rows and counts read the new services and their supplier chain.
      ...[SUPPLIER_CATALOGUE_KEY, SUPPLIER_GROUPS_KEY, ...SUPPLIER_STALE_KEYS, CATALOG_ROWS_KEY].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    ]);
    if (run.status === 'succeeded') {
      toast({ kind: 'success', title: `${servicesText(run.created)} added from ${supplier.name}` });
    }
  }, [run, supplier.id, supplier.name, invalidate, queryClient]);

  return { run, query };
}
