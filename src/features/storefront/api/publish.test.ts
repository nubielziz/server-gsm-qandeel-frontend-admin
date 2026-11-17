// Tests for the publish run API functions, run against the dev mock API: each one reaches its route with the method, address and body
// of the backend plan (B228), reads the answer the Publish tab shows, and the refusals the plan lists come back as 409 or 422 with
// the field. The mock plays the server and moves a run by reads, so a run's status here depends on how often it was read.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  applyPublishRun,
  bulkUpdatePublishItems,
  cancelPublishRun,
  createPublishRun,
  getPublishRun,
  listPublishItems,
  listPublishRuns,
  setPublishRunListed,
  updatePublishItem,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

/** The error a request failed with; a request that succeeds fails the test. */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('The request was expected to fail.');
}
const scopeError = async (promise: Promise<unknown>) => {
  const error = await failure(promise);
  return [error.status, Object.entries(error.fieldErrors).map(([field, messages]) => [field, messages[0]])];
};

// Records of the mock seed (see mocks/publishSeed.ts): run 5 is a draft of 60 rows, runs 1 to 3 are finished, 4 was checked again.
const DRAFT = 5;
const FINISHED = 1;
const STALLED = 3;
const VODAFONE_UK = 4; // a ready row with a typed price
const BELL = 11;
const LONG_TITLE = 21; // a row that needs a look
const NOKIA = 40; // blocked: price_missing
const FILE_SERVICE = 57; // blocked: not_orderable

describe('createPublishRun', () => {
  it('posts the scope and answers the run, preparing, with the number of services counted now', async () => {
    const requests = recordRequests();
    const run = await createPublishRun({ scope: { kind: 'all' } });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { scope: { kind: 'all' } } });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs');
    expect(run).toMatchObject({
      id: 8,
      status: 'preparing',
      source: 'console',
      total: 60,
      listed: true,
      auto: false,
      requestedByName: 'Rami K.',
      scope: { kind: 'all' },
    });
  });

  it('sends listed: false, and every scope as the plan names it', async () => {
    const requests = recordRequests();
    const off = await createPublishRun({ scope: { kind: 'category', categoryId: 4 }, listed: false });
    expect(requests.last().body).toEqual({ scope: { kind: 'category', categoryId: 4 }, listed: false });
    expect(off).toMatchObject({ listed: false, scope: { kind: 'category', categoryId: 4 } });
    expect(off.total).toBeGreaterThan(0);
    await createPublishRun({ scope: { kind: 'supplier', supplierId: 2 } });
    await createPublishRun({ scope: { kind: 'quickAddRun', runId: 1 } });
    expect(requests.last().body).toEqual({ scope: { kind: 'quickAddRun', runId: 1 } });
  });

  it('takes the ticked services of the scope, a listed one as a blocked row', async () => {
    const run = await createPublishRun({ scope: { kind: 'services', serviceIds: [15, 1, 15] } });
    expect(run.total).toBe(2);
    const rows = (await listPublishItems(run.id)).data;
    expect(rows.map((row) => [row.serviceId, row.state, row.blockedReason])).toEqual([
      [15, 'ready', null],
      [1, 'blocked', 'already_listed'],
    ]);
  });

  it('refuses a scope with nothing to publish, an unknown category, supplier, run or service, with the field', async () => {
    expect(await scopeError(createPublishRun({ scope: { kind: 'quickAddRun', runId: 3 } }))).toEqual([
      422,
      [['scope', 'Nothing to publish: every service of this choice is already on the shop.']],
    ]);
    expect((await scopeError(createPublishRun({ scope: { kind: 'category', categoryId: 999 } })))[1]).toEqual(
      [['scope.categoryId', 'Choose a category that exists.']],
    );
    expect((await scopeError(createPublishRun({ scope: { kind: 'supplier', supplierId: 99 } })))[1]).toEqual([
      ['scope.supplierId', 'Choose a supplier that exists.'],
    ]);
    expect((await scopeError(createPublishRun({ scope: { kind: 'quickAddRun', runId: 99 } })))[1]).toEqual([
      ['scope.runId', 'Choose a Quick add run that exists.'],
    ]);
    expect((await scopeError(createPublishRun({ scope: { kind: 'run', runId: 99 } })))[1]).toEqual([
      ['scope.runId', 'Choose a run that exists.'],
    ]);
    expect(
      (await scopeError(createPublishRun({ scope: { kind: 'services', serviceIds: [999] } })))[1],
    ).toEqual([['scope.serviceIds', 'Service 999 does not exist.']]);
  });

  it('Check again: a new draft from a draft, with the staff’s edits and the old draft cancelled and linked', async () => {
    await updatePublishItem(DRAFT, BELL, { title: 'Bell Canada Unlock Pro' });
    const again = await createPublishRun({ scope: { kind: 'run', runId: DRAFT } });
    expect(again).toMatchObject({
      id: 8,
      status: 'preparing',
      total: 60,
      scope: { kind: 'run', runId: DRAFT },
      source: 'console',
    });
    const old = await getPublishRun(DRAFT);
    expect(old).toMatchObject({ status: 'cancelled', replacedBy: 8 });
    const rows = (await listPublishItems(8, { filters: { afterId: 10 }, end: 1 })).data;
    expect(rows[0]).toMatchObject({ id: BELL, title: 'Bell Canada Unlock Pro', edited: true });
  });

  it('Review the rest: a new draft of the rows a finished run did not publish', async () => {
    const rest = await createPublishRun({ scope: { kind: 'run', runId: FINISHED } });
    expect(rest.total).toBe(3);
  });

  it('refuses a run that is still working with a 409', async () => {
    const made = await createPublishRun({ scope: { kind: 'all' } });
    const error = await failure(createPublishRun({ scope: { kind: 'run', runId: made.id } }));
    expect([error.status, error.code, error.detail]).toEqual([409, 'CONFLICT', 'That run is still working.']);
  });
});

describe('listPublishRuns and getPublishRun', () => {
  it('lists the runs with the total, newest first when asked, and filters by status, source and Quick add run', async () => {
    const requests = recordRequests();
    const all = await listPublishRuns({ sort: ['id'], order: ['desc'] });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs');
    expect(all.total).toBe(7);
    expect(all.data.map((run) => run.id)).toEqual([7, 6, 5, 4, 3, 2, 1]);
    const drafts = await listPublishRuns({ filters: { status: 'draft' } });
    expect(drafts.data.map((run) => run.id)).toEqual([DRAFT]);
    expect(requests.last().url.searchParams.get('status')).toBe('draft');
    const quick = await listPublishRuns({ filters: { source: 'quick_add', quickAddRunId: 2 } });
    expect(quick.data).toHaveLength(1);
    expect(quick.data[0]).toMatchObject({ id: 7, auto: true, requestedBy: null, requestedByName: null });
  });

  it('reads one run with its counts and switch, and a missing run is a 404', async () => {
    const requests = recordRequests();
    const run = await getPublishRun(FINISHED);
    expect(requests.last()).toMatchObject({ method: 'GET' });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs/1');
    expect(run).toMatchObject({
      status: 'succeeded',
      total: 12,
      counts: { published: 9, skipped: 2, refused: 1, pending: 0 },
      switch: { status: null, listed: null, switched: 0, skipped: 0, error: null },
      replacedBy: null,
    });
    expect((await failure(getPublishRun(99))).status).toBe(404);
  });

  it('counts a draft’s rows by state, and the rows that wait for a rule', async () => {
    const draft = await getPublishRun(DRAFT);
    expect(draft.counts).toMatchObject({
      ready: 30,
      review: 11,
      blocked: 19,
      included: 30,
      noRule: 3,
      published: 0,
      pending: 60,
    });
  });

  it('moves a run by reads: preparing, then a draft; queued, then running, then succeeded', async () => {
    const made = await createPublishRun({ scope: { kind: 'category', categoryId: 4 } });
    expect((await getPublishRun(made.id)).status).toBe('preparing');
    expect((await getPublishRun(made.id)).status).toBe('draft');
    expect((await applyPublishRun(made.id, {})).status).toBe('queued');
    const running = await getPublishRun(made.id);
    expect(running.status).toBe('running');
    expect(running.counts.published).toBeGreaterThan(0);
    const done = await getPublishRun(made.id);
    expect(done.status).toBe('succeeded');
    expect(done.counts.pending).toBe(0);
  });
});

describe('listPublishItems', () => {
  it('lists the rows of a run with the total, the service and every figure the server works out', async () => {
    const requests = recordRequests();
    const rows = await listPublishItems(DRAFT, { start: 0, end: 50 });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs/5/items');
    expect(rows.total).toBe(60);
    expect(rows.data).toHaveLength(50);
    expect(rows.data[0]).toMatchObject({
      id: 1,
      title: 'AT&T USA Premier Unlock',
      slug: 'atandt-usa-premier-unlock',
      brand: 'Apple',
      carrier: 'AT&T',
      country: 'US',
      cost: '13.5000',
      floorPrice: '15.7400',
      rulePrice: '16.9900',
      retailPrice: '16.9900',
      marginPct: '20.5415',
      priceMode: 'rule',
      state: 'ready',
      blockedReason: null,
      included: true,
      result: null,
      listingListed: null,
      service: { type: 'imei', categoryName: 'Carrier unlock' },
      rule: { id: 3 },
    });
  });

  it('filters by state, tick, flag, kind of brand and result, and only the rows after an id', async () => {
    const ids = async (filters: Record<string, string | number | boolean>) =>
      (await listPublishItems(DRAFT, { filters, end: 100 })).data.map((row) => row.id);
    expect((await listPublishItems(DRAFT, { filters: { state: 'blocked' } })).total).toBe(19);
    expect((await listPublishItems(DRAFT, { filters: { state: 'review' } })).total).toBe(11);
    expect((await listPublishItems(DRAFT, { filters: { included: false } })).total).toBe(30);
    expect(await ids({ flag: 'duplicate_name' })).toEqual([23, 24, 25, 26]);
    expect(await ids({ flag: 'no_rule', result: 'pending' })).toEqual([40, 41, 42]);
    expect((await listPublishItems(DRAFT, { filters: { brandKind: 'tool' } })).total).toBe(5);
    expect(await ids({ state: 'review', afterId: 25 })).toEqual([26, 27, 28, 29, 30, 31]);
    expect((await listPublishItems(FINISHED, { filters: { result: 'published' } })).total).toBe(9);
    expect((await listPublishItems(STALLED, { filters: { result: 'pending' } })).total).toBe(5);
  });

  it('searches the title, the address, the service’s name and code, and sorts by id, title or cost', async () => {
    const found = await listPublishItems(DRAFT, { q: 'imp-101' });
    expect(found.data.map((row) => row.id)).toEqual([1]);
    expect((await listPublishItems(DRAFT, { q: 'telus-canada' })).data.map((row) => row.id)).toEqual([9]);
    expect((await listPublishItems(DRAFT, { q: 'Z3X' })).data.map((row) => row.service.code)).toEqual([
      'SRV-Z3X-10',
    ]);
    const byCost = await listPublishItems(DRAFT, { sort: ['cost'], order: ['desc'], end: 2 });
    expect(byCost.data.map((row) => row.cost)).toEqual(['13.5000', '13.5000']);
    const byTitle = await listPublishItems(DRAFT, { sort: ['title'], order: ['asc'], end: 1 });
    expect(byTitle.data[0].title).toBe('');
  });
});

describe('updatePublishItem', () => {
  it('sends only what changed and answers the row worked out again', async () => {
    const requests = recordRequests();
    const row = await updatePublishItem(DRAFT, BELL, {
      title: 'Bell Canada Unlock Pro',
      brand: 'Apple',
      country: 'ca',
    });
    expect(requests.last()).toMatchObject({
      method: 'PATCH',
      body: { title: 'Bell Canada Unlock Pro', brand: 'Apple', country: 'ca' },
    });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs/5/items/11');
    expect(row).toMatchObject({
      title: 'Bell Canada Unlock Pro',
      country: 'CA',
      edited: true,
      detected: { title: 'Bell Canada Unlock' },
    });
  });

  it('a typed price is a manual price, a price under the floor is refused, and the rule can replace a typed price', async () => {
    const typed = await updatePublishItem(DRAFT, BELL, { retailPrice: '8.5' });
    expect(typed).toMatchObject({ priceMode: 'manual', retailPrice: '8.5000', replacesPrice: null });
    const refused = await scopeError(updatePublishItem(DRAFT, BELL, { retailPrice: '1.00' }));
    expect(refused).toEqual([422, [['retailPrice', 'Below the storefront floor of $8.39.']]]);
    // A service that has a price: Verizon's row carries the 8.49 it had typed; keeping is possible, and so is the rule over it.
    const keep = await updatePublishItem(DRAFT, 3, { pricing: 'keep' });
    expect(keep).toMatchObject({ priceMode: 'keep', retailPrice: '8.4900', replacesPrice: null });
    const rule = await updatePublishItem(DRAFT, 3, { pricing: 'rule' });
    expect(rule).toMatchObject({ priceMode: 'rule', retailPrice: '8.9900', replacesPrice: '8.4900' });
    expect(await scopeError(updatePublishItem(DRAFT, BELL, { pricing: 'keep' }))).toEqual([
      422,
      [['pricing', 'This service has no price to keep.']],
    ]);
  });

  it('a fix that removes the blocking reason lets the row leave blocked, and a tick on a blocked row is refused', async () => {
    const stuck = await scopeError(updatePublishItem(DRAFT, NOKIA, { included: true }));
    expect(stuck).toEqual([422, [['included', 'Cannot publish: it has no price.']]]);
    const fixed = await updatePublishItem(DRAFT, NOKIA, { retailPrice: '7.50' });
    expect(fixed).toMatchObject({ state: 'ready', blockedReason: null, included: true, flags: [] });
    expect((await getPublishRun(DRAFT)).counts).toMatchObject({ ready: 31, blocked: 18, noRule: 2 });
    expect(await scopeError(updatePublishItem(DRAFT, FILE_SERVICE, { included: true }))).toEqual([
      422,
      [['included', 'Cannot publish: it cannot be ordered online.']],
    ]);
  });

  it('refuses a bad title, address or country, an empty body and keys that cannot go together, each with its field', async () => {
    expect((await scopeError(updatePublishItem(DRAFT, BELL, { title: '' })))[1]).toEqual([
      ['title', 'Enter 1 to 200 characters on one line.'],
    ]);
    expect((await scopeError(updatePublishItem(DRAFT, BELL, { slug: 'Not A Slug' })))[1]).toEqual([
      ['slug', 'Use lower-case words joined by hyphens.'],
    ]);
    expect((await scopeError(updatePublishItem(DRAFT, BELL, { slug: 'telus-canada-unlock' })))[1]).toEqual([
      ['slug', 'That address is taken by another listing.'],
    ]);
    expect((await scopeError(updatePublishItem(DRAFT, BELL, { country: 'CAN' })))[1]).toEqual([
      ['country', 'Use two letters, or leave it empty.'],
    ]);
    expect((await scopeError(updatePublishItem(DRAFT, BELL, {})))[1]).toEqual([
      ['body', 'Send at least one field to change.'],
    ]);
    expect(
      (await scopeError(updatePublishItem(DRAFT, BELL, { retailPrice: '9', pricing: 'rule' })))[1],
    ).toEqual([['retailPrice', 'Send a price or a pricing choice, not both.']]);
    expect((await scopeError(updatePublishItem(DRAFT, BELL, { reset: true, title: 'x' })))[1]).toEqual([
      ['reset', 'Reset goes alone, with no other key.'],
    ]);
  });

  it('an empty address makes it from the title again, and reset puts back what was detected', async () => {
    await updatePublishItem(DRAFT, BELL, { title: 'Bell Canada Unlock Pro', slug: 'bell-pro' });
    const again = await updatePublishItem(DRAFT, BELL, { slug: '' });
    expect(again.slug).toBe('bell-canada-unlock-pro');
    const reset = await updatePublishItem(DRAFT, BELL, { reset: true });
    expect(reset).toMatchObject({ title: 'Bell Canada Unlock', slug: 'bell-canada-unlock', edited: false });
  });

  it('refuses an edit of a run that is no longer a draft with a 409, and a missing row with a 404', async () => {
    const error = await failure(updatePublishItem(FINISHED, 1, { included: false }));
    expect([error.status, error.detail]).toEqual([409, 'This run is no longer a draft.']);
    expect((await failure(updatePublishItem(DRAFT, 999, { included: false }))).status).toBe(404);
  });
});

describe('bulkUpdatePublishItems', () => {
  it('ticks and unticks rows named by id, and counts the blocked rows it refused', async () => {
    const requests = recordRequests();
    const result = await bulkUpdatePublishItems(DRAFT, {
      select: { itemIds: [VODAFONE_UK, LONG_TITLE, NOKIA] },
      set: { included: true },
    });
    expect(requests.last()).toMatchObject({ method: 'POST' });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs/5/items/bulk');
    expect(requests.last().body).toEqual({ select: { itemIds: [4, 21, 40] }, set: { included: true } });
    // Row 4 is ticked already, row 21 changes, row 40 is blocked.
    expect(result).toEqual({ changed: 1, refused: 1 });
    expect((await getPublishRun(DRAFT)).counts.included).toBe(31);
  });

  it('works on every row that matches a filter, and sets a fact on the rows with its badges worked out again', async () => {
    const left = await bulkUpdatePublishItems(DRAFT, {
      select: { filter: { state: 'ready' } },
      set: { included: false },
    });
    expect(left).toEqual({ changed: 30, refused: 0 });
    const facts = await bulkUpdatePublishItems(DRAFT, {
      select: { filter: { flag: 'no_brand' } },
      set: { brand: 'Generic', carrier: '', country: 'US' },
    });
    expect(facts.changed).toBe(3);
    const rows = (await listPublishItems(DRAFT, { filters: { flag: 'no_brand' } })).data;
    expect(rows.map((row) => [row.brand, row.country, row.edited])).toEqual(
      Array(3).fill(['Generic', 'US', true]),
    );
  });

  it('refuses an empty selection, nothing to set and a run that is no longer a draft', async () => {
    expect(
      (
        await scopeError(bulkUpdatePublishItems(DRAFT, { select: { itemIds: [] }, set: { included: true } }))
      )[1],
    ).toEqual([['select', 'Name one to 500 rows, or a filter.']]);
    expect(
      (await scopeError(bulkUpdatePublishItems(DRAFT, { select: { itemIds: [1] }, set: {} })))[1],
    ).toEqual([['set', 'Send at least one thing to set.']]);
    const error = await failure(
      bulkUpdatePublishItems(FINISHED, { select: { itemIds: [1] }, set: { included: false } }),
    );
    expect([error.status, error.detail]).toEqual([409, 'This run is no longer a draft.']);
  });
});

describe('applyPublishRun, cancelPublishRun and setPublishRunListed', () => {
  it('applies a draft: queued, with the listed choice stored; applying a failed run continues it', async () => {
    const requests = recordRequests();
    const run = await applyPublishRun(DRAFT, { listed: false });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { listed: false } });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs/5/apply');
    expect(run).toMatchObject({ status: 'queued', listed: false, error: null });
    const resumed = await applyPublishRun(STALLED, {});
    expect(resumed.status).toBe('queued');
    expect(resumed.counts.refused).toBe(0);
  });

  it('refuses each state the plan lists, with its words', async () => {
    const words = async (id: number) => {
      const error = await failure(applyPublishRun(id, {}));
      return [error.status, error.code, error.detail];
    };
    expect(await words(FINISHED)).toEqual([409, 'CONFLICT', 'This run is finished. Start a new one.']);
    expect(await words(4)).toEqual([409, 'CONFLICT', 'This run is finished. Start a new one.']);
    expect(await words(6)).toEqual([409, 'CONFLICT', 'The preview was not finished. Start a new one.']);
    const made = await createPublishRun({ scope: { kind: 'all' } });
    expect(await words(made.id)).toEqual([409, 'CONFLICT', 'The preview is still being prepared.']);
    await applyPublishRun(DRAFT, {});
    expect(await words(DRAFT)).toEqual([409, 'JOB_ALREADY_RUNNING', 'This run is already being published.']);
  });

  it('refuses a draft with no included row, on the field included', async () => {
    await bulkUpdatePublishItems(DRAFT, { select: { filter: { included: true } }, set: { included: false } });
    expect(await scopeError(applyPublishRun(DRAFT, {}))).toEqual([
      422,
      [['included', 'No row is included.']],
    ]);
  });

  it('cancels a draft, and refuses a run that is finished', async () => {
    const requests = recordRequests();
    const run = await cancelPublishRun(DRAFT, {});
    expect(requests.last()).toMatchObject({ method: 'POST', body: {} });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs/5/cancel');
    expect(run.status).toBe('cancelled');
    const error = await failure(cancelPublishRun(FINISHED));
    expect([error.status, error.code]).toEqual([409, 'CONFLICT']);
  });

  it('switches a finished run off the shop and back: queued, running, then done, with the listings moved', async () => {
    const requests = recordRequests();
    const queued = await setPublishRunListed(FINISHED, { listed: false });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { listed: false } });
    expect(requests.last().url.pathname).toBe('/admin/publish-runs/1/listed');
    expect(queued).toMatchObject({
      listed: false,
      switch: { status: 'queued', listed: false, switched: 0, skipped: 0, error: null },
    });
    expect((await getPublishRun(FINISHED)).switch).toMatchObject({ status: 'running', switched: 4 });
    const done = await getPublishRun(FINISHED);
    expect(done.switch).toMatchObject({ status: 'done', listed: false, switched: 9, skipped: 0 });
    const rows = (await listPublishItems(FINISHED, { filters: { result: 'published' } })).data;
    expect(rows.map((row) => row.listingListed)).toEqual(Array(9).fill(false));
  });

  it('refuses a switch of a run that is not finished, that published nothing, or that is being switched', async () => {
    const words = async (id: number) => {
      const error = await failure(setPublishRunListed(id, { listed: false }));
      return [error.status, error.code, error.detail];
    };
    expect(await words(DRAFT)).toEqual([409, 'CONFLICT', 'Only a finished run can be switched.']);
    expect(await words(4)).toEqual([409, 'CONFLICT', 'This run published nothing.']);
    await setPublishRunListed(FINISHED, { listed: false });
    expect(await words(FINISHED)).toEqual([409, 'JOB_ALREADY_RUNNING', 'This run is being switched.']);
    // A switch that is going also stops an apply.
    const error = await failure(applyPublishRun(FINISHED, {}));
    expect([error.status, error.code]).toEqual([409, 'JOB_ALREADY_RUNNING']);
  });
});
