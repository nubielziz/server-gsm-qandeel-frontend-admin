// The "With selected" actions of the All view: runs one (useServicesBulk), unticks the services it covered, keeps the summary of what the
// server refused, and opens the publish run that "Put on the shop" made (after the summary, when there is one).
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import type { BulkSummary, RowSelection } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { useServicesBulk, type BulkResult } from '../../../hooks/useServicesBulk';
import { productsPath } from '../../../lib/productsPath';
import type { Service } from '../../../types';

/** The actions, `finish` to run one over some services, and the summary of refusals to show until it is closed. */
export function useAllBulk(type: ServiceType, selection: RowSelection<number>) {
  const bulk = useServicesBulk();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  // The run "Put on the shop" made, opened once the summary of the refused switch-ons is closed.
  const [nextRun, setNextRun] = useState<Id | null>(null);

  const openRun = useCallback(
    (runId: Id) => void navigate(productsPath({ view: 'publish', type, run: runId })),
    [navigate, type],
  );

  const { setMany } = selection;
  const finish = useCallback(
    async (action: Promise<BulkResult>, covered: readonly Service[]) => {
      const result = await action;
      setMany(
        covered.map((service) => service.id),
        false,
      );
      if (result.summary) {
        setSummary(result.summary);
        setNextRun(result.runId);
      } else if (result.runId !== null) openRun(result.runId);
    },
    [setMany, openRun],
  );

  const closeSummary = useCallback(() => {
    setSummary(null);
    if (nextRun !== null) openRun(nextRun);
    setNextRun(null);
  }, [nextRun, openRun]);

  return { bulk, finish, summary, closeSummary };
}
