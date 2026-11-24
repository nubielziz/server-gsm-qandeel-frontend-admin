// The bulk action of the Ranks view: Delete on the ticked ranks. There is no bulk route, so it makes one call per rank, one after the other
// (the shared runner), with one progress line, one toast and a summary of the refusals in the server's own words.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast, type BulkSummary } from '@/components/ui';
import { summarizeOutcome, useSequentialRun } from '@/lib/bulk';
import { deleteRank } from '../../api';
import { ACCOUNT_STALE_KEYS } from '../../hooks/keys';
import type { Rank } from '../../types';

const NAMING = { keyOf: (rank: Rank) => rank.id, labelOf: (rank: Rank) => rank.name };
const ranksText = (count: number) => `${count} ${count === 1 ? 'rank' : 'ranks'}`;

/** A change of ranks also changes what account rows say about their rank, and the numbers of the strip and the status menu. */
function useRanksRefresh() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      invalidate({ resource: 'client-groups', invalidates: ['list', 'many', 'detail'] }),
      invalidate({ resource: 'clients', invalidates: ['list', 'many', 'detail'] }),
      ...ACCOUNT_STALE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ]);
  }, [invalidate, queryClient]);
}

/**
 * `remove(ranks)` deletes each rank in turn and resolves with the summary of the refusals, or null when every rank went through.
 * `progress` is set while it runs. The server refuses a rank that still has accounts and always the retail rank (409): its words are in
 * the summary and that rank stays.
 */
export function useRankBulk() {
  const refresh = useRanksRefresh();
  const { run, progress } = useSequentialRun<number>(refresh);

  const remove = useCallback(
    async (ranks: readonly Rank[]): Promise<BulkSummary | null> => {
      if (ranks.length === 0) {
        toast({ kind: 'info', title: 'Nothing to delete', body: 'None of the ticked ranks can be deleted.' });
        return null;
      }
      const outcome = await run(
        'Deleting',
        ranks.map((rank) => rank.id),
        (id) => deleteRank(id),
      );
      // One rank, one name: the same words as a single delete would give.
      const done =
        ranks.length === 1 ? `${ranks[0].name} rank deleted` : `${ranksText(outcome.done)} deleted`;
      toast(
        outcome.done > 0
          ? { kind: 'success', title: done }
          : { kind: 'error', title: 'No rank was deleted', body: outcome.failed[0]?.reason },
      );
      const summary = summarizeOutcome('deleted', ranks, outcome, NAMING);
      return summary.failed.length > 0 ? summary : null;
    },
    [run],
  );

  return { remove, progress };
}
