// The ranks (a Refine list) and the actions on them. The ranks are few, so they are read whole: the Ranks view, the rank filter, the rank
// menu and the new-account form share one cached read.
import { useList } from '@refinedev/core';
import { useApiMutation } from '@/lib/query';
import { createRank, deleteRank, updateRank } from '../api';
import type { CreateRankBody, Rank, UpdateRankBody } from '../types';
import { ACCOUNT_STALE_KEYS, LIST_CAP } from './keys';

/** The ranks in the order the server keeps them (`sort`). Pass `enabled: false` while the staff member lacks `groups:read`. */
export function useRanks(enabled = true) {
  const { result, query } = useList<Rank>({
    resource: 'client-groups',
    pagination: { currentPage: 1, pageSize: LIST_CAP },
    sorters: [{ field: 'sort', order: 'asc' }],
    queryOptions: { enabled },
    // Each place that shows ranks has its own error state, so Refine's default toast would only repeat it.
    errorNotification: false,
  });
  return { ranks: result.data, total: result.total, query };
}

const NO_ERROR_TOAST = () => false as const;

// A change of a rank also changes what account rows say about it (name, discount, counts), and the strip counts.
const ranksAndAccounts = (id?: number) => [{ resource: 'client-groups', id }, { resource: 'clients' }];

/** Creates a merchant rank. */
export function useCreateRank() {
  return useApiMutation({
    mutationFn: (body: CreateRankBody) => createRank(body),
    invalidates: ranksAndAccounts(),
    invalidateKeys: ACCOUNT_STALE_KEYS,
    successNotification: (rank) => ({
      message: `${rank.name} rank created`,
      description: 'The Owner moves accounts into it from their page.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a rank; a new discount applies to the next order of its accounts. */
export function useUpdateRank() {
  return useApiMutation({
    mutationFn: ({ rank, body }: { rank: Pick<Rank, 'id' | 'name'>; body: UpdateRankBody }) =>
      updateRank(rank.id, body),
    invalidates: (_updated, { rank }) => ranksAndAccounts(rank.id),
    invalidateKeys: ACCOUNT_STALE_KEYS,
    successNotification: (_updated, { rank, body }) => ({
      message: `${body.name ?? rank.name} rank updated`,
      description: 'The change applies to the next order of its accounts.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Deletes a rank; the server refuses while accounts are still in it, and always for the retail rank. */
export function useDeleteRank() {
  return useApiMutation({
    mutationFn: (rank: Pick<Rank, 'id' | 'name'>) => deleteRank(rank.id),
    invalidates: (_result, rank) => ranksAndAccounts(rank.id),
    invalidateKeys: ACCOUNT_STALE_KEYS,
    successNotification: (_result, rank) => ({ message: `${rank.name} rank deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
