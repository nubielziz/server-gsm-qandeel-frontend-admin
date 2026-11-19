// Tests for the retail pricing API functions, run against the dev mock API: each one reaches its route with the method, address and
// body of the backend plan (B229, B230), reads the answer the Retail pricing tab shows, and the refusals the plan lists come back as
// 422 with the field. The mock plays the server and does no price arithmetic, so the figures are the seed's.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import type { ResolveRetailPriceChangesBody } from '../types';
import {
  createRetailPriceRule,
  deleteRetailPriceRule,
  listListings,
  listRetailPriceChanges,
  listRetailPriceRules,
  previewRetailPriceRule,
  resolveRetailPriceChanges,
  updateRetailPriceRule,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const failure = (promise: Promise<unknown>) => promise.catch((error: unknown) => error as ApiError);

// Records of the mock seed (see mocks/pricingSeed.ts).
const IMEI_RULE = 2;
const CARRIER_RULE = 3;
const SERVER_RULE_OFF = 4;
const CARRIER_UNLOCK_CATEGORY = 4;
const WAITING = [5, 6, 7];

describe('listRetailPriceRules', () => {
  it('lists the rules in the server’s order with their words, and sends the filters', async () => {
    const requests = recordRequests();
    const all = await listRetailPriceRules();
    expect(requests.last().method).toBe('GET');
    expect(requests.last().url.pathname).toBe('/admin/retail-price-rules');
    expect(all.total).toBe(4);
    expect(all.data.map((rule) => [rule.scope, rule.label])).toEqual([
      ['global', 'Every service +25%, ends in .99'],
      ['type', 'IMEI +30%'],
      ['type', 'Server +15%'],
      ['category', 'Carrier unlock +20% +$0.50, up to 5 cents'],
    ]);
    expect(all.data[3]).toMatchObject({
      categoryId: CARRIER_UNLOCK_CATEGORY,
      categoryName: 'Carrier unlock',
    });
    const active = await listRetailPriceRules({ filters: { isActive: true, scope: 'type' } });
    expect(Object.fromEntries(requests.last().url.searchParams)).toEqual({ isActive: 'true', scope: 'type' });
    expect(active.data.map((rule) => rule.id)).toEqual([IMEI_RULE]);
  });
});

describe('createRetailPriceRule', () => {
  it('posts the rule and answers it with its label and nothing following yet', async () => {
    const requests = recordRequests();
    const rule = await createRetailPriceRule({
      scope: 'type',
      serviceType: 'remote',
      percent: '12.5000',
      fixed: '0.5000',
      rounding: 'ends_99',
      roundFrom: '5.0000',
      autoFollowPercent: 10,
    });
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: { scope: 'type', serviceType: 'remote', percent: '12.5000', autoFollowPercent: 10 },
    });
    expect(requests.last().url.pathname).toBe('/admin/retail-price-rules');
    expect(rule).toMatchObject({
      scope: 'type',
      serviceType: 'remote',
      isActive: true,
      following: 0,
      label: 'Remote +12.5% +$0.50, ends in .99',
    });
    expect((await listRetailPriceRules()).total).toBe(5);
  });

  it('refuses a second rule for one target, a target that does not fit and a figure outside its limits', async () => {
    const twin = (await failure(
      createRetailPriceRule({ scope: 'type', serviceType: 'imei', percent: '10.0000', rounding: 'cent' }),
    )) as ApiError;
    expect(twin.status).toBe(422);
    expect(twin.fieldErrors.scope).toEqual(['A rule for this already exists. Edit it instead.']);
    const misfit = (await failure(
      createRetailPriceRule({
        scope: 'global',
        serviceType: 'imei',
        categoryId: 1,
        percent: '10.0000',
        rounding: 'cent',
      }),
    )) as ApiError;
    expect(Object.keys(misfit.fieldErrors).sort()).toEqual(['categoryId', 'serviceType']);
    const high = (await failure(
      createRetailPriceRule({ scope: 'category', categoryId: 1, percent: '1000.0001', rounding: 'cent' }),
    )) as ApiError;
    expect(high.fieldErrors.percent).toEqual(['The margin can be at most 1,000%.']);
  });
});

describe('updateRetailPriceRule and deleteRetailPriceRule', () => {
  it('patches only what is sent, turns a rule on and never changes its target', async () => {
    const requests = recordRequests();
    const off = await updateRetailPriceRule(SERVER_RULE_OFF, { isActive: true });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { isActive: true } });
    expect(requests.last().url.pathname).toBe(`/admin/retail-price-rules/${SERVER_RULE_OFF}`);
    expect(off).toMatchObject({ isActive: true, scope: 'type', serviceType: 'server' });
    const changed = await updateRetailPriceRule(IMEI_RULE, { percent: '35.0000', rounding: 'ends_99' });
    expect(changed.label).toBe('IMEI +35%, ends in .99');
    const refused = (await failure(
      updateRetailPriceRule(IMEI_RULE, { percent: '5', scope: 'global' } as never),
    )) as ApiError;
    expect(refused.fieldErrors.scope).toBeTruthy();
    expect(((await failure(updateRetailPriceRule(99, { isActive: false }))) as ApiError).status).toBe(404);
  });

  it('deletes a rule with a 204 and then it is gone from the list', async () => {
    const requests = recordRequests();
    await expect(deleteRetailPriceRule(CARRIER_RULE)).resolves.toBeUndefined();
    expect(requests.last()).toMatchObject({ method: 'DELETE' });
    expect(requests.last().url.pathname).toBe(`/admin/retail-price-rules/${CARRIER_RULE}`);
    expect((await listRetailPriceRules()).data.map((rule) => rule.id)).not.toContain(CARRIER_RULE);
    expect(((await failure(deleteRetailPriceRule(CARRIER_RULE))) as ApiError).status).toBe(404);
  });
});

describe('previewRetailPriceRule', () => {
  it('posts the change and answers the server’s counts and lines, storing nothing', async () => {
    const requests = recordRequests();
    const preview = await previewRetailPriceRule({
      change: { kind: 'update', id: IMEI_RULE, rule: { percent: '35.0000' } },
    });
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: { change: { kind: 'update', id: IMEI_RULE, rule: { percent: '35.0000' } } },
    });
    expect(requests.last().url.pathname).toBe('/admin/retail-price-rules/preview');
    expect(preview).toMatchObject({
      following: 6,
      changes: 3,
      raised: 2,
      lowered: 1,
      atFloor: 1,
      truncated: false,
    });
    expect(preview.lines[2]).toMatchObject({ code: 'IMEI-VZW-USA', atFloor: true, newPrice: '8.3100' });
    expect((await listRetailPriceRules()).data.find((rule) => rule.id === IMEI_RULE)?.percent).toBe(
      '30.0000',
    );
  });

  it('answers what taking a rule away does, and refuses like the write it previews', async () => {
    const global = await previewRetailPriceRule({ change: { kind: 'delete', id: 1 } });
    expect(global).toMatchObject({ following: 3, changes: 0, noRule: 3, lines: [] });
    const carrier = await previewRetailPriceRule({
      change: { kind: 'update', id: CARRIER_RULE, rule: { isActive: false } },
    });
    expect(carrier).toMatchObject({ following: 4, changes: 4, noRule: 0 });
    const refused = (await failure(
      previewRetailPriceRule({
        change: {
          kind: 'create',
          rule: { scope: 'type', serviceType: 'imei', percent: '1', rounding: 'cent' },
        },
      }),
    )) as ApiError;
    expect(refused.fieldErrors['change.rule.scope']).toEqual([
      'A rule for this already exists. Edit it instead.',
    ]);
  });
});

describe('listRetailPriceChanges', () => {
  it('lists the changes with their service and rule, and the waiting ones are the proposals', async () => {
    const requests = recordRequests();
    const all = await listRetailPriceChanges({ sort: ['id'], order: ['desc'] });
    expect(all.total).toBe(7);
    expect(all.data[0]).toMatchObject({
      id: 7,
      kind: 'proposed',
      reason: 'cost_jump',
      waiting: true,
      resolution: null,
      service: { id: 6, code: 'IMEI-TMO-USA' },
      rule: { id: CARRIER_RULE, label: 'Carrier unlock +20% +$0.50, up to 5 cents' },
    });
    const waiting = await listRetailPriceChanges({ filters: { waiting: true } });
    expect(requests.last().url.searchParams.get('waiting')).toBe('true');
    expect(waiting.data.map((change) => change.id).sort()).toEqual(WAITING);
    expect(waiting.data.find((change) => change.reason === 'no_cost')?.newPrice).toBeNull();
    const detached = await listRetailPriceChanges({ filters: { kind: 'detached', serviceId: 13 } });
    expect(detached.data.map((change) => change.id)).toEqual([1]);
  });
});

describe('resolveRetailPriceChanges', () => {
  it('applies a proposal at the figure it showed and the listing then follows the rule at that price', async () => {
    const requests = recordRequests();
    const body: ResolveRetailPriceChangesBody = {
      action: 'apply',
      ids: [7],
      seen: [{ id: 7, newPrice: '24.9900' }],
    };
    const answer = await resolveRetailPriceChanges(body);
    expect(requests.last()).toMatchObject({ method: 'POST', body });
    expect(requests.last().url.pathname).toBe('/admin/retail-price-changes/resolve');
    expect(answer).toEqual({ applied: 1, kept: 0, skipped: [] });
    const listing = (await listListings({ q: 'T-Mobile' })).data[0];
    expect(listing).toMatchObject({
      retailPrice: '24.9900',
      retailPriceSource: 'rule',
      retailPriceWaiting: false,
    });
    const [change] = (await listRetailPriceChanges({ filters: { serviceId: 6 } })).data.filter(
      (c) => c.id === 7,
    );
    expect(change).toMatchObject({ waiting: false, resolution: 'applied', resolvedBy: 1 });
  });

  it('keeps the current price as a typed one with no seen key, and skips what is not waiting, has no cost or moved', async () => {
    const requests = recordRequests();
    const kept = await resolveRetailPriceChanges({ action: 'keep', ids: [7] });
    expect(requests.last().body).toEqual({ action: 'keep', ids: [7] });
    expect(kept).toEqual({ applied: 0, kept: 1, skipped: [] });
    expect((await listListings({ q: 'T-Mobile' })).data[0]).toMatchObject({
      retailPrice: '19.9900',
      retailPriceSource: 'manual',
      retailPriceRule: null,
    });
    const mixed = await resolveRetailPriceChanges({
      action: 'apply',
      ids: [7, 6, 5, 2, 999],
      seen: [
        { id: 7, newPrice: '24.9900' },
        { id: 6, newPrice: null },
        { id: 5, newPrice: '27.9900' },
        { id: 2, newPrice: '14.9900' },
        { id: 999, newPrice: null },
      ],
    });
    expect(mixed.applied).toBe(0);
    expect(mixed.skipped).toEqual([
      { id: 7, reason: 'not_waiting' },
      { id: 6, reason: 'no_cost' },
      { id: 5, reason: 'changed' },
      { id: 2, reason: 'not_waiting' },
      { id: 999, reason: 'not_waiting' },
    ]);
    // The proposal that moved now shows the new figure and is applied when asked again with that figure.
    const [again] = (await listRetailPriceChanges({ filters: { serviceId: 10, waiting: true } })).data;
    expect(again.newPrice).toBe('28.4900');
    expect(
      await resolveRetailPriceChanges({ action: 'apply', ids: [5], seen: [{ id: 5, newPrice: '28.4900' }] }),
    ).toEqual({ applied: 1, kept: 0, skipped: [] });
  });

  it('answers changed and writes no price when the figure seen is not the proposal’s', async () => {
    // Proposal 7 shows 24.99: a stale 22.99 is not it. Nothing is applied, and the proposal still waits.
    const stale = await resolveRetailPriceChanges({
      action: 'apply',
      ids: [7],
      seen: [{ id: 7, newPrice: '22.9900' }],
    });
    expect(stale).toEqual({ applied: 0, kept: 0, skipped: [{ id: 7, reason: 'changed' }] });
    expect((await listListings({ q: 'T-Mobile' })).data[0]).toMatchObject({
      retailPrice: '19.9900',
      retailPriceWaiting: true,
    });
    const [still] = (await listRetailPriceChanges({ filters: { serviceId: 6, waiting: true } })).data;
    expect(still).toMatchObject({ id: 7, waiting: true, newPrice: '24.9900' });
    // A figure that is not the proposal's, also when the proposal has none.
    const none = await resolveRetailPriceChanges({
      action: 'apply',
      ids: [7],
      seen: [{ id: 7, newPrice: null }],
    });
    expect(none.skipped).toEqual([{ id: 7, reason: 'changed' }]);
  });

  it('refuses no ids, too many ids and an unknown action', async () => {
    expect(
      ((await failure(resolveRetailPriceChanges({ action: 'keep', ids: [] }))) as ApiError).fieldErrors.ids,
    ).toBeTruthy();
    const many = Array.from({ length: 201 }, (_, index) => index + 1);
    expect(
      ((await failure(resolveRetailPriceChanges({ action: 'keep', ids: many }))) as ApiError).status,
    ).toBe(422);
    const bad = (await failure(
      resolveRetailPriceChanges({ action: 'delete', ids: [1] } as never),
    )) as ApiError;
    expect(bad.fieldErrors.action).toBeTruthy();
  });

  it('refuses an apply whose seen list is missing, short, long, doubled or malformed, on the field seen', async () => {
    const seen = async (body: unknown) => {
      const error = (await failure(resolveRetailPriceChanges(body as never))) as ApiError;
      return [error.status, error.fieldErrors.seen];
    };
    const ok = { id: 7, newPrice: '24.9900' };
    const refused = [422, [expect.any(String)]];
    expect(await seen({ action: 'apply', ids: [7] })).toEqual(refused);
    expect(await seen({ action: 'apply', ids: [7], seen: [] })).toEqual(refused);
    // One short, one extra id, one entry twice, one id of another request.
    expect(await seen({ action: 'apply', ids: [7, 5], seen: [ok] })).toEqual(refused);
    expect(await seen({ action: 'apply', ids: [7], seen: [ok, { id: 5, newPrice: '27.9900' }] })).toEqual(
      refused,
    );
    expect(await seen({ action: 'apply', ids: [7], seen: [ok, ok] })).toEqual(refused);
    expect(await seen({ action: 'apply', ids: [7], seen: [{ id: 5, newPrice: '27.9900' }] })).toEqual(
      refused,
    );
    // An entry with no figure key, a figure that is not a four-decimal amount, an unknown key.
    expect(await seen({ action: 'apply', ids: [7], seen: [{ id: 7 }] })).toEqual(refused);
    expect(await seen({ action: 'apply', ids: [7], seen: [{ id: 7, newPrice: '24.99' }] })).toEqual(refused);
    expect(await seen({ action: 'apply', ids: [7], seen: [{ ...ok, extra: 1 }] })).toEqual(refused);
  });

  it('accepts a repeated id when seen names it once, and refuses seen with keep', async () => {
    const answer = await resolveRetailPriceChanges({
      action: 'apply',
      ids: [7, 7],
      seen: [{ id: 7, newPrice: '24.9900' }],
    });
    expect(answer.applied).toBe(1);
    const error = (await failure(
      resolveRetailPriceChanges({
        action: 'keep',
        ids: [5],
        seen: [{ id: 5, newPrice: '27.9900' }],
      } as never),
    )) as ApiError;
    expect(error.status).toBe(422);
    expect(error.fieldErrors.seen).toBeTruthy();
    expect(error.fieldErrors.ids).toBeUndefined();
  });
});
