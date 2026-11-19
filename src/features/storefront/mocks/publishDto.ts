// How a mock publish run moves and what it sends: its counts come from its rows, and it advances by READS (never timers): `preparing` reads
// `draft` on the second read, `queued` reads `running` (half done) then `succeeded`, a run switch reads `running` then `done`. The mock
// invents no price: a published row gets the price its row already shows.
import type { PublishItem, PublishRun } from '../types';
import { publishedRow, unpublishedRow } from './publishSeed';
import type { MockPublishRun } from './types';

/** The counts of a run that has no rows evaluated yet (a run is created with these, and the read fills them in). */
export function emptyCounts(): PublishRun['counts'] {
  return {
    ready: 0,
    review: 0,
    blocked: 0,
    included: 0,
    noRule: 0,
    published: 0,
    skipped: 0,
    refused: 0,
    pending: 0,
  };
}

/** The counts of the run, from its rows (nothing is evaluated while the preview is being prepared). */
export function countsOf(m: MockPublishRun): PublishRun['counts'] {
  const rows = m.run.status === 'preparing' ? [] : m.items;
  const count = (test: (item: PublishItem) => boolean) => rows.filter(test).length;
  const [published, skipped, refused] = (['published', 'skipped', 'refused'] as const).map((result) =>
    count((item) => item.result === result),
  );
  return {
    ready: count((item) => item.state === 'ready'),
    review: count((item) => item.state === 'review'),
    blocked: count((item) => item.state === 'blocked'),
    included: count((item) => item.included),
    noRule: count((item) => item.flags.includes('no_rule')),
    published,
    skipped,
    refused,
    pending: m.run.total - published - skipped - refused,
  };
}

/** The run as `GET /admin/publish-runs/:id` sends it right now. */
export function viewOf(m: MockPublishRun): PublishRun {
  return { ...m.run, counts: countsOf(m) };
}

/** Rows that were not ticked are skipped when the apply starts: `left_out`, or the reason that blocked them. */
function leaveOut(m: MockPublishRun): void {
  m.items = m.items.map((item) =>
    item.result === null && !item.included
      ? unpublishedRow(item, 'skipped', item.blockedReason ?? 'left_out')
      : item,
  );
}

/** Publishes (or refuses, for the rows the seed marks) up to `limit` of the included rows that have no result yet. */
function publishSome(m: MockPublishRun, limit: number): void {
  let left = limit;
  m.items = m.items.map((item) => {
    if (left <= 0 || item.result !== null || !item.included) return item;
    left -= 1;
    const refusal = m.refusals.get(item.id);
    return refusal
      ? unpublishedRow(item, 'refused', refusal.reason, refusal.detail)
      : publishedRow(item, m.run.listed);
  });
}

/** The rows the run switch moves. Switching on leaves the last one off when there are several (a service disabled meanwhile). */
function completeSwitch(m: MockPublishRun): void {
  const target = m.run.switch.listed === true;
  const rows = m.items.filter((item) => item.result === 'published');
  const left = target && rows.length >= 3 ? rows[rows.length - 1] : undefined;
  m.items = m.items.map((item) =>
    item.result === 'published' && item !== left ? { ...item, listingListed: target } : item,
  );
  m.run.switch = {
    ...m.run.switch,
    status: 'done',
    switched: rows.length - (left ? 1 : 0),
    skipped: left ? 1 : 0,
  };
}

/** One read of the run: moves a run that is working one step on. Reads of the list do not call this. */
export function advance(m: MockPublishRun): void {
  const { run } = m;
  const now = new Date().toISOString();
  if (run.status === 'preparing') {
    m.reads += 1;
    if (m.reads >= 2) {
      run.status = 'draft';
      run.preparedAt = now;
      m.reads = 0;
      // An automatic run (Quick add's) goes on to be published as soon as it is prepared, when a row is ticked (plan 6.1 step 6).
      if (run.auto && m.items.some((item) => item.included)) run.status = 'queued';
    }
  } else if (run.status === 'queued') {
    run.status = 'running';
    run.startedAt ??= now;
    leaveOut(m);
    publishSome(m, Math.floor(m.items.filter((item) => item.included).length / 2));
  } else if (run.status === 'running') {
    publishSome(m, m.items.length);
    run.status = 'succeeded';
    run.finishedAt = now;
  }
  if (run.switch.status === 'queued') {
    run.switch = { ...run.switch, status: 'running', switched: Math.floor(countsOf(m).published / 2) };
  } else if (run.switch.status === 'running') {
    completeSwitch(m);
  }
}

/** A row with no result, as the resume of a failed run sets back the rows that were refused with `failed`. */
export function reopen(m: MockPublishRun): void {
  m.items = m.items.map((item) =>
    item.result === 'refused' && item.resultReason === 'failed'
      ? { ...item, result: null, resultReason: null, resultDetail: null }
      : item,
  );
}
