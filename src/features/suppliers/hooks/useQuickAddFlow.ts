// The state of the whole-groups path of the Add services flow: the stage, the picks, how the services are added, the shop switch and
// the run. It reads the supplier's newest run first (a run that is still going opens on its progress) and tells the page behind once
// when a run that added services has ended. The server builds the list and does the work; this sends a scope and follows the run.
import { useEffect, useRef, useState } from 'react';
import { useRowSelection } from '@/components/ui';
import { isApiError, type Id } from '@/lib/api';
import {
  CONFIRM_ABOVE,
  isLive,
  pickedGroups,
  pickedTotals,
  quickAddBody,
  tooManyGroups,
} from '../lib/quickAdd';
import { refusalText, shopSwitch, type FlowStage } from '../lib/quickAddFlow';
import { isNoRuleRefusal } from '../lib/quickAddPublish';
import type { QuickAddRun, QuickAddServiceStatus, Supplier } from '../types';
import { useQuickAddRun, useServiceGroups, useStartQuickAdd } from './useQuickAdd';
import { useShopRule } from './useQuickAddRule';
import { useSupplierGrants } from './useSupplierGrants';

/** What a refused start says; `noRule` is the server's "no shop price rule is active", which comes with a link to the rules. */
export type FlowFailure = { text: string; noRule: boolean };

/**
 * Everything the dialog of the path shows and does. `onDone` is called once for each run that ended having added services.
 * The picks and the choices survive Back; "Add more" clears the picks, "Back to groups" after a stopped run keeps them.
 */
export function useQuickAddFlow(supplier: Pick<Supplier, 'id' | 'name'>, onDone?: () => void) {
  const [stage, setStage] = useState<FlowStage>('prices');
  const [tracked, setTracked] = useState<QuickAddRun | null>(null);
  const [serviceStatus, setServiceStatus] = useState<QuickAddServiceStatus>('active');
  // null until the person touches the shop switch: then its default (on with an active rule) applies.
  const [shopChoice, setShopChoice] = useState<boolean | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<FlowFailure | null>(null);
  const selection = useRowSelection<string>();
  const grants = useSupplierGrants();
  const groups = useServiceGroups(supplier.id);
  const start = useStartQuickAdd(supplier.id);
  const { run, query } = useQuickAddRun(supplier, tracked);
  const rule = useShopRule(grants.ready, grants.can('pricing:read'));
  const decided = useRef(false);
  const announced = useRef(new Set<Id>());

  // Once, when the first fresh answer arrives: a run of this supplier that is still going is shown at once.
  useEffect(() => {
    if (decided.current || !groups.isFetchedAfterMount || !groups.data) return;
    decided.current = true;
    const latest = groups.data.latestRun;
    if (latest && isLive(latest)) {
      setTracked(latest);
      setStage('progress');
    }
  }, [groups.isFetchedAfterMount, groups.data]);

  // The page behind refreshes once per run that ended with services added.
  useEffect(() => {
    if (!run || isLive(run) || run.created === 0 || announced.current.has(run.id)) return;
    announced.current.add(run.id);
    onDone?.();
  }, [run, onDone]);

  const list = groups.data?.groups ?? [];
  const shop = shopSwitch({
    serviceStatus,
    canPublish: grants.can('storefront:publish'),
    rule,
    choice: shopChoice,
  });
  const body = quickAddBody(list, selection.selected, serviceStatus, shop.checked);
  const picked = { ...pickedTotals(list, selection.selected), tooMany: tooManyGroups(body) };
  const needsConfirm = picked.services > CONFIRM_ABOVE;

  // A refused start: another run is live (show it), the server wants a rule (stay, with the link), nothing is left to add (go back
  // with fresh counts), or anything else.
  async function startFailed(error: unknown) {
    if (isApiError(error) && error.code === 'JOB_ALREADY_RUNNING') {
      const latest = (await groups.refetch()).data?.latestRun;
      if (latest) {
        setTracked(latest);
        setStage('progress');
        return;
      }
    }
    const noRule = isNoRuleRefusal(error);
    if (!noRule && isApiError(error) && error.status === 422) {
      void groups.refetch();
      setStage('prices');
    }
    setFailure({ text: refusalText(error), noRule });
  }

  return {
    stage,
    grants,
    groups,
    list,
    selection,
    picked,
    scope: body.scope,
    pickedGroupCount: pickedGroups(list, selection.selected).length,
    serviceStatus,
    onServiceStatus: setServiceStatus,
    shop: { ...shop, onChange: setShopChoice },
    rule,
    confirmed,
    onConfirmed: setConfirmed,
    needsConfirm,
    failure,
    adding: start.isPending,
    run,
    query,
    next() {
      if (picked.groups === 0 || picked.tooMany) return;
      setConfirmed(false);
      setFailure(null);
      setStage('finish');
    },
    back() {
      setFailure(null);
      setStage('prices');
    },
    async begin() {
      if (start.isPending || (needsConfirm && !confirmed)) return;
      setFailure(null);
      try {
        setTracked(await start.mutateAsync(body));
        setStage('progress');
      } catch (error) {
        await startFailed(error);
      }
    },
    again(clearPicks: boolean) {
      if (clearPicks) selection.clear();
      setTracked(null);
      setConfirmed(false);
      setFailure(null);
      setStage('prices');
      void groups.refetch();
    },
  };
}
