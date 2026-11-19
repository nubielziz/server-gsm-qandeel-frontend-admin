// The hand-over of Quick add as the suppliers mock plays it (plan 6.3): when a Quick add run is started, the suppliers mock tells this
// store how many services it made (so "Prepare the shop preview" knows the run) and, when the run asked to publish, an automatic publish
// run is made. The suppliers mock calls these; this feature's own code never does. The run moves by READS of the runs list filtered by
// `quickAddRunId` (preparing, then queued, then running, then succeeded), never by timers.
import { emptyCounts } from './publishDto';
import { fresh } from './publishScope';
import { storefrontStore } from './store';

/** Whether any retail pricing rule is active: Quick add's `publish` is refused with `no_rule` when none is (plan 5.5). */
export async function anyRetailRuleActive(): Promise<boolean> {
  const stores = await storefrontStore();
  return stores.pricing.rules.list().some((rule) => rule.isActive);
}

/**
 * A Quick add run started and made `created` services. Records it for the scope `quickAddRun` and, when `listed` is a boolean (the
 * run asked to publish), inserts the automatic publish run in `preparing`, as `publish_from_quick_add` does. One run per Quick add
 * run (the plan's unique index): a second call changes nothing.
 */
export async function handOverQuickAdd(
  quickAddRunId: number,
  created: number,
  listed: boolean | null,
): Promise<void> {
  const stores = await storefrontStore();
  const { publish } = stores;
  publish.quickAddRuns.set(quickAddRunId, created);
  if (listed === null) return;
  const rows = fresh(publish.template.slice(0, Math.min(created, publish.template.length)));
  const id = publish.runs.list().reduce((top, row) => Math.max(top, row.id), 0) + 1;
  publish.runs.insert({
    id,
    run: {
      id,
      status: 'preparing',
      source: 'quick_add',
      quickAddRunId,
      scope: { kind: 'quickAddRun', runId: quickAddRunId },
      listed,
      auto: true,
      total: rows.length,
      counts: emptyCounts(),
      switch: { status: null, listed: null, switched: 0, skipped: 0, error: null },
      replacedBy: null,
      error: null,
      requestedBy: null,
      requestedByName: null,
      createdAt: new Date().toISOString(),
      preparedAt: null,
      startedAt: null,
      finishedAt: null,
    },
    items: rows,
    reads: 0,
    switchReads: 0,
    refusals: new Map(),
  });
}
