// The actions of the Group view: switching a group on or off, moving it one place, and the bulk actions on the ticked groups (activate,
// deactivate, delete). A bulk action has no bulk route, so it makes one call per group, one after the other (the shared runner, MISMATCHES M23),
// with one progress line, one toast and a summary of the refusals in the server's own words.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast, type BulkSummary } from '@/components/ui';
import { summarizeOutcome, useSequentialRun } from '@/lib/bulk';
import { SERVICE_ROWS_KEY, useApiMutation } from '@/lib/query';
import { deleteCategory, updateCategory } from '../api';
import type { PositionChange } from '../lib/groupList';
import type { ServiceCategory } from '../types';
import { SERVICE_PICKER_KEY } from './keys';

/** What a change of groups makes stale: the group lists, and the service lists and menus that print group names and counts. */
function useGroupRefresh() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      invalidate({ resource: 'service-categories', invalidates: ['list', 'many', 'detail'] }),
      invalidate({ resource: 'services', invalidates: ['list', 'many', 'detail'] }),
      queryClient.invalidateQueries({ queryKey: SERVICE_PICKER_KEY }),
      queryClient.invalidateQueries({ queryKey: SERVICE_ROWS_KEY }),
    ]);
  }, [invalidate, queryClient]);
}

/** Switches one group on or off (the square in its row). A refusal shows as the server's own toast. */
export function useSetGroupActive() {
  return useApiMutation({
    mutationFn: ({ group, isActive }: { group: ServiceCategory; isActive: boolean }) =>
      updateCategory(group.id, { isActive }),
    invalidates: (_result, { group }) => [
      { resource: 'service-categories', id: group.id },
      { resource: 'services' },
    ],
    invalidateKeys: [SERVICE_PICKER_KEY, SERVICE_ROWS_KEY],
    successNotification: (group, { isActive }) => ({
      message: `${group.name} ${isActive ? 'activated' : 'deactivated'}`,
    }),
  });
}

/**
 * Saves the position writes of one move (see `moveChanges`), one after the other. When one is refused the ones before it stay, so the
 * list is read again either way and shows what the server holds.
 */
export function useMoveGroup() {
  const invalidate = useInvalidate();
  return useApiMutation({
    mutationFn: async ({ changes }: { changes: readonly PositionChange[] }) => {
      for (const change of changes) await updateCategory(change.id, { sort: change.sort });
    },
    invalidates: [{ resource: 'service-categories' }],
    onError: () =>
      void invalidate({ resource: 'service-categories', invalidates: ['list', 'many', 'detail'] }),
  });
}

const NAMING = {
  keyOf: (group: ServiceCategory) => group.id,
  labelOf: (group: ServiceCategory) => group.name,
};
const groupsText = (count: number) => `${count} ${count === 1 ? 'group' : 'groups'}`;

/** Each action resolves with the summary of the refusals, or null when every group went through. `progress` is set while one runs. */
export function useGroupBulk() {
  const refresh = useGroupRefresh();
  const { run, progress } = useSequentialRun<number>(refresh);

  const each = useCallback(
    async (
      verbs: { doing: string; done: string },
      targets: readonly ServiceCategory[],
      step: (group: ServiceCategory) => Promise<unknown>,
    ): Promise<BulkSummary | null> => {
      if (targets.length === 0) {
        toast({ kind: 'info', title: 'Nothing to change', body: 'None of the ticked groups needs it.' });
        return null;
      }
      const byId = new Map(targets.map((group) => [group.id, group]));
      const outcome = await run(
        verbs.doing,
        targets.map((group) => group.id),
        (id) => step(byId.get(id) as ServiceCategory),
      );
      toast(
        outcome.done > 0
          ? { kind: 'success', title: `${groupsText(outcome.done)} ${verbs.done}` }
          : { kind: 'error', title: `No group was ${verbs.done}`, body: outcome.failed[0]?.reason },
      );
      const summary = summarizeOutcome(verbs.done, targets, outcome, NAMING);
      return summary.failed.length > 0 ? summary : null;
    },
    [run],
  );

  const activate = useCallback(
    (groups: readonly ServiceCategory[]) =>
      each(
        { doing: 'Activating', done: 'activated' },
        groups.filter((group) => !group.isActive),
        (group) => updateCategory(group.id, { isActive: true }),
      ),
    [each],
  );
  const deactivate = useCallback(
    (groups: readonly ServiceCategory[]) =>
      each(
        { doing: 'Deactivating', done: 'deactivated' },
        groups.filter((group) => group.isActive),
        (group) => updateCategory(group.id, { isActive: false }),
      ),
    [each],
  );
  /** The server refuses a group that services still use (409): its words are in the summary, and the group stays. */
  const remove = useCallback(
    (groups: readonly ServiceCategory[]) =>
      each({ doing: 'Deleting', done: 'deleted' }, groups, (group) => deleteCategory(group.id)),
    [each],
  );

  return { activate, deactivate, remove, progress };
}
