// The sign-out of many accounts (the With selected strip's "Sign out everywhere"): one request per account, one after the other (there is no
// bulk route), with the line "Signing out 3 of 7…" while it runs. The accounts' records and the counts are read again once, at the end.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSequentialRun, type SequentialOutcome } from '@/lib/bulk';
import { revokeAccountSessions } from '../../api';
import { ACCOUNT_STALE_KEYS } from '../../hooks/keys';
import type { AccountRow } from '../../types';

/**
 * `signOut(accounts)` signs each account out of every device and answers which went through and which did not, with the server's words
 * (it never throws); `line` is the progress line while it runs, else null.
 *
 * Side effects: `POST /admin/clients/:id/sessions/revoke` for each account; at the end the lists and records of accounts and the counts
 * are marked stale.
 */
export function useSignOutAccounts() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const refresh = useCallback(async () => {
    await Promise.all([
      ...ACCOUNT_STALE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      invalidate({ resource: 'clients', invalidates: ['list', 'many', 'detail'] }),
    ]);
  }, [invalidate, queryClient]);
  const { run, progress } = useSequentialRun<number>(refresh);

  const signOut = useCallback(
    (accounts: readonly Pick<AccountRow, 'id'>[]): Promise<SequentialOutcome<number>> =>
      run(
        'Signing out',
        accounts.map((account) => account.id),
        (id) => revokeAccountSessions(id),
      ),
    [run],
  );

  // The account being worked on is the one after those finished.
  const line = progress
    ? `${progress.verb} ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
    : null;
  return { signOut, line };
}
