// What a refused reused key makes stale: the first press of that dialog opening did post, so the wallet, the statement and the record the
// person sees may be behind. The dialog says so in plain words (lib/keyReuse); this refreshes the reads so the page shows what was applied.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback } from 'react';
import { isKeyReused } from '../lib/keyReuse';
import { staleAccount } from './keys';

/**
 * Gives an `onError` for a keyed write: when the server refused a reused key it marks the account's record and `keys` stale; any other
 * error does nothing here (the dialog shows it).
 *
 * @param keys the reads the write makes stale when it succeeds (the same list its `invalidateKeys` has).
 * @returns `(error, account) => void`.
 * Side effects: invalidates React Query reads and the account's Refine records.
 */
export function useRefreshOnKeyReuse(keys: readonly QueryKey[]) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useCallback(
    (error: unknown, account: { id: number }) => {
      if (!isKeyReused(error)) return;
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
      for (const target of staleAccount(account.id)) {
        void invalidate({
          resource: target.resource,
          id: target.id,
          invalidates: ['list', 'many', 'detail'],
        });
      }
    },
    [invalidate, keys, queryClient],
  );
}
