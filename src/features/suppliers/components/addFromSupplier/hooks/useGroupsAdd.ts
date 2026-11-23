// The whole-groups path of the Add-from-supplier form: the picks, the confirm box for a big run, the start of a quick add run and the run
// that is followed while it goes on in the background. It shows a run of the supplier that is still going at once, and tells the page
// behind once for each run that ended having added services. The server builds the list and does the work; this sends a scope and follows the run.
import { useEffect, useRef, useState } from 'react';
import { useRowSelection, type RowSelection } from '@/components/ui';
import { isApiError, type Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { useQuickAddRun, useStartQuickAdd, type useServiceGroups } from '../../../hooks/useQuickAdd';
import { CONFIRM_ABOVE, isLive, pickedTotals, quickAddBody, tooManyGroups } from '../../../lib/quickAdd';
import { refusalText } from '../../../lib/quickAddFlow';
import { isNoRuleRefusal } from '../../../lib/quickAddPublish';
import type { QuickAddRun, QuickAddServiceStatus, Supplier } from '../../../types';
import { kindGroups } from '../lib/addRules';

/** What a refused start says; `noRule` is the server's "no shop price rule is active", which comes with a link to the rules. */
export type GroupsFailure = { text: string; noRule: boolean };

/** What the whole-groups path needs from the form: the supplier (none until one is chosen), the page's kind, the choices and who to tell. */
export type GroupsAddArgs = {
  supplier: Supplier | undefined;
  groups: ReturnType<typeof useServiceGroups>;
  type: ServiceType;
  status: QuickAddServiceStatus;
  /** "Put on the shop" is Yes: the run asks the server to put what it adds on the shop when it ends. */
  shop: boolean;
  onDone: (createdIds: Id[]) => void;
};

/** What the path shows and does. */
export type GroupsAdd = {
  /** The groups of the page's kind, in the server's order: the table. */
  list: ReturnType<typeof kindGroups>;
  selection: RowSelection<string>;
  /** How many groups are picked, how many services they add, and whether too many groups are named for one request. */
  picked: { groups: number; services: number; tooMany: boolean };
  /** A big run asks for a tick box before it starts. */
  needsConfirm: boolean;
  confirmed: boolean;
  setConfirmed: (confirmed: boolean) => void;
  failure: GroupsFailure | null;
  /** The start request is on its way. */
  adding: boolean;
  /** The run on screen (the one this form started, or the supplier's live one), and the read that follows it. */
  run: QuickAddRun | undefined;
  query: ReturnType<typeof useQuickAddRun>['query'];
  /** A run of this supplier is queued or working. */
  live: boolean;
  begin: () => Promise<void>;
  /** Forgets the picks and the run on screen (another supplier was chosen). */
  reset: () => void;
};

/**
 * The whole-groups path. Only the groups of the page's kind are offered, but the body is worked out against every group of the supplier:
 * a request names every pickable group as the scope `all` only when no group of another kind could be left out of it, so a Server page
 * never starts a run that adds IMEI groups too. Starting adds services; a refusal of the server comes back as `failure`.
 */
export function useGroupsAdd({ supplier, groups, type, status, shop, onDone }: GroupsAddArgs): GroupsAdd {
  const selection = useRowSelection<string>();
  const [tracked, setTracked] = useState<QuickAddRun | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<GroupsFailure | null>(null);
  const start = useStartQuickAdd(supplier?.id ?? 0);
  const announced = useRef(new Set<Id>());

  // A run of this supplier that is still going is shown at once, also when another window started it.
  const latest = groups.data?.latestRun ?? null;
  const shown = tracked ?? (latest !== null && isLive(latest) ? latest : null);
  const { run, query } = useQuickAddRun({ id: supplier?.id ?? 0, name: supplier?.name ?? '' }, shown);

  // The page behind is told once for each run that ended with services added.
  useEffect(() => {
    if (!run || isLive(run) || run.created === 0 || announced.current.has(run.id)) return;
    announced.current.add(run.id);
    onDone([]);
  }, [run, onDone]);

  const every = groups.data?.groups ?? [];
  const body = quickAddBody(every, selection.selected, status, shop);
  const picked = { ...pickedTotals(every, selection.selected), tooMany: tooManyGroups(body) };
  const needsConfirm = picked.services > CONFIRM_ABOVE;

  // A refused start: another run is live (show it), the server wants a rule (say so, with the link), nothing is left to add (read the
  // counts again), or anything else.
  async function startFailed(error: unknown): Promise<void> {
    if (isApiError(error) && error.code === 'JOB_ALREADY_RUNNING') {
      const newest = (await groups.refetch()).data?.latestRun;
      if (newest) {
        setTracked(newest);
        return;
      }
    }
    const noRule = isNoRuleRefusal(error);
    if (!noRule && isApiError(error) && error.status === 422) void groups.refetch();
    setFailure({ text: refusalText(error), noRule });
  }

  return {
    list: kindGroups(every, type),
    selection,
    picked,
    needsConfirm,
    confirmed,
    setConfirmed,
    failure,
    adding: start.isPending,
    run,
    query,
    live: run !== undefined && isLive(run),
    async begin() {
      if (start.isPending || (needsConfirm && !confirmed)) return;
      setFailure(null);
      try {
        setTracked(await start.mutateAsync(body));
        setConfirmed(false);
      } catch (error) {
        await startFailed(error);
      }
    },
    reset() {
      selection.clear();
      setTracked(null);
      setConfirmed(false);
      setFailure(null);
    },
  };
}
