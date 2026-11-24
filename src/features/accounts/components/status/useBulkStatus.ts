// The run behind the many-account dialogs of Suspend and Reactivate: one request per account, in order (the API has no bulk status
// route, the same reason as the orders' bulk actions), a progress line while it goes, one refresh at the end, and either a toast (every
// account went through) or the summary of what the server refused. The sequential runner is the console's own (lib/bulk).
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast, type BulkSummary } from '@/components/ui';
import { summarizeOutcome, useSequentialRun } from '@/lib/bulk';
import { ACCOUNT_STALE_KEYS } from '../../hooks/keys';
import type { AccountRow } from '../../types';
import { accountLabel } from '../shared/accountLabel';

/**
 * `runOver(verb, past, accounts, step)` calls `step(account)` for each account and says whether every call went through. `progress` is set
 * while a run goes ("Suspending" 3 of 7); `summary` is set when the server refused some (the dialog shows it and clears it by closing).
 * Side effects: the accounts' lists, records and counts are marked stale once the run ends; a toast when none was refused.
 */
export function useBulkStatus() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const refresh = useCallback(
    async (ids: readonly number[]) => {
      await Promise.all([
        invalidate({ resource: 'clients', invalidates: ['list', 'many'] }),
        ...ids.map((id) => invalidate({ resource: 'clients', id, invalidates: ['detail'] })),
        ...ACCOUNT_STALE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ]);
    },
    [invalidate, queryClient],
  );
  const { run, progress } = useSequentialRun<number>(refresh);
  const [summary, setSummary] = useState<BulkSummary | null>(null);

  const runOver = useCallback(
    async (
      verb: string,
      past: string,
      accounts: readonly AccountRow[],
      step: (account: AccountRow) => Promise<unknown>,
    ): Promise<boolean> => {
      const byId = new Map(accounts.map((account) => [account.id, account] as const));
      const outcome = await run(verb, [...byId.keys()], (id) => {
        const account = byId.get(id);
        return account ? step(account) : Promise.resolve();
      });
      if (outcome.failed.length === 0) {
        toast({ kind: 'success', title: `${accounts.length} accounts ${past}` });
        return true;
      }
      setSummary(
        summarizeOutcome(past, accounts, outcome, { keyOf: (account) => account.id, labelOf: accountLabel }),
      );
      return false;
    },
    [run],
  );

  return { runOver, progress, summary, closeSummary: () => setSummary(null) };
}
