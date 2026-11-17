// The Publish tab's mock runs: seven earlier runs for the history (ids 1 to 7; the draft is 5, the preview of all 60 rows) and the
// rows a finished run shows. The 60 rows themselves are in `publishRows.ts`. The mock does no price arithmetic (M92): a published row
// shows the price its row already had.
import { Collection } from '@/mocks/db';
import { toIso } from '@/mocks/seed';
import { buildPublishItems } from './publishRows';
import type { MockPublishRun, MockService, PublishStores } from './types';
import type { PublishItem, PublishRun } from '../types';

const DAY = 86_400_000;
/** The staff member the mock signs in (the demo's owner), for `requestedBy` and `requestedByName`. */
export const MOCK_STAFF = { id: 1, name: 'Rami K.' };
export const STALLED_ERROR =
  'The run stopped before it finished. Start it again: it continues with what is left.';
export const PREPARE_STALLED_ERROR = 'The preview was not finished. Start a new one.';

/** The row of a run's page with the figures the server writes at the end of an apply. */
export function publishedRow(item: PublishItem, listed: boolean): PublishItem {
  return {
    ...item,
    result: 'published',
    resultReason: null,
    listingId: 1000 + item.serviceId,
    publishedPrice: item.retailPrice,
    listingListed: listed,
  };
}

/** A row that ended as left out (not ticked) or refused for a reason, with the server's detail. */
export function unpublishedRow(
  item: PublishItem,
  result: 'skipped' | 'refused',
  reason: PublishItem['resultReason'],
  detail: string | null = null,
): PublishItem {
  return { ...item, result, resultReason: reason, resultDetail: detail };
}

type RunPlan = Partial<PublishRun> & {
  id: number;
  status: PublishRun['status'];
  total: number;
  ageDays: number;
};

/** A run's wire object with the defaults of a run a person started in the console; `counts` are filled in when it is read. */
function runOf(plan: RunPlan, now: number): PublishRun {
  const { ageDays, ...rest } = plan;
  const created = now - ageDays * DAY;
  return {
    source: 'console',
    quickAddRunId: null,
    scope: { kind: 'all' },
    listed: true,
    auto: false,
    counts: {
      ready: 0,
      review: 0,
      blocked: 0,
      included: 0,
      noRule: 0,
      published: 0,
      skipped: 0,
      refused: 0,
      pending: 0,
    },
    switch: { status: null, listed: null, switched: 0, skipped: 0, error: null },
    replacedBy: null,
    error: null,
    requestedBy: MOCK_STAFF.id,
    requestedByName: MOCK_STAFF.name,
    createdAt: toIso(created),
    preparedAt: toIso(created + 60_000),
    startedAt: null,
    finishedAt: null,
    ...rest,
  };
}

/** The seven runs of the history; ids 1 to 7, the draft is 5 (the preview of all 60 rows). */
export function buildPublishStores(
  services: ReadonlyMap<number, MockService>,
  categories: ReadonlyMap<number, string>,
  listedServices: readonly number[],
  now: number,
): PublishStores {
  const template = buildPublishItems(services, categories, toIso(now - 5 * 60_000));
  const rows = (ids: number[]) => ids.map((id, index) => ({ ...template[id - 1], id: index + 1 }));
  const run = (plan: RunPlan, items: PublishItem[], refusals: MockPublishRun['refusals'] = new Map()) => ({
    id: plan.id,
    run: runOf(plan, now),
    items,
    reads: 0,
    switchReads: 0,
    refusals,
  });
  const ready = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const done = { startedAt: toIso(now - 6 * DAY), finishedAt: toIso(now - 6 * DAY + 90_000) };
  const first = [
    ...rows(ready).map((item) => publishedRow(item, true)),
    ...rows([21, 24]).map((item, i) => unpublishedRow({ ...item, id: 10 + i }, 'skipped', 'left_out')),
    ...rows([22]).map((item) =>
      unpublishedRow(
        { ...item, id: 12, included: true },
        'refused',
        'cost_moved',
        'The cost moved from $9.80 to $15.10, more than the rule allows.',
      ),
    ),
  ];
  const stalled = rows([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]).map((item, i) =>
    i < 4
      ? publishedRow(item, true)
      : i === 4
        ? unpublishedRow(item, 'refused', 'failed', 'service_listings_slug_uq')
        : item,
  );
  const quick = [
    ...rows([11, 12, 13, 14, 15]).map((item) => publishedRow(item, true)),
    ...rows([23, 24]).map((item, i) => unpublishedRow({ ...item, id: 6 + i }, 'skipped', 'left_out')),
  ];
  const refusals: MockPublishRun['refusals'] = new Map([
    [3, { reason: 'cost_moved', detail: 'The cost moved from $5.60 to $9.40, more than the rule allows.' }],
  ]);
  const runs: MockPublishRun[] = [
    run({ id: 1, status: 'succeeded', total: 12, ageDays: 6, scope: { kind: 'all' }, ...done }, first),
    run(
      {
        id: 2,
        status: 'succeeded',
        total: 6,
        ageDays: 4,
        scope: { kind: 'category', categoryId: 4 },
        listed: false,
        ...done,
      },
      rows([10, 11, 12, 13, 14, 15]).map((item) => publishedRow(item, false)),
    ),
    run(
      { id: 3, status: 'failed', total: 10, ageDays: 3, error: STALLED_ERROR, startedAt: done.startedAt },
      stalled,
    ),
    run({ id: 4, status: 'cancelled', total: 60, ageDays: 2, replacedBy: 5 }, []),
    run(
      { id: 5, status: 'draft', total: 60, ageDays: 0 },
      template.map((item) => ({ ...item })),
      refusals,
    ),
    run(
      { id: 6, status: 'failed', total: 8, ageDays: 1, error: PREPARE_STALLED_ERROR, preparedAt: null },
      [],
    ),
    run(
      {
        id: 7,
        status: 'succeeded',
        total: 7,
        ageDays: 1,
        source: 'quick_add',
        quickAddRunId: 2,
        auto: true,
        requestedBy: null,
        requestedByName: null,
        scope: { kind: 'quickAddRun', runId: 2 },
        ...done,
      },
      quick,
    ),
  ];
  return { runs: new Collection(runs), template, listedServices };
}
