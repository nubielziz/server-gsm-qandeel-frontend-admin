// Tests for the pricing API functions (pricing rules, the bulk price change and the price resolver), run against the dev mock API: each one
// reaches its route with the body of its assumed contract. The mock plays the server, so prices, previews and traces are its answers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  applyBulkPrice,
  createPricingRule,
  deletePricingRule,
  getPricingRule,
  getService,
  listPricingRules,
  previewBulkPrice,
  resolvePrice,
  updatePricingRule,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const ATT = 5;
const CREDITS = 6; // a category with three services
const CAIRO = 5; // VIP, client override 15.20 on the AT&T unlock
const ERBIL = 6; // Standard

const promo = {
  scope: 'category' as const,
  targetId: CREDITS,
  groupId: null,
  kind: 'promo' as const,
  percent: '5.0000',
  fixed: '0.0000',
  rounding: 'none' as const,
  minProfit: '0.0000',
  priority: 50,
  startsAt: '2026-03-05T00:00:00.000Z',
  endsAt: '2026-03-20T23:59:59.999Z',
};

describe('pricing rules', () => {
  it('lists the rules sorted by priority, with the target joined', async () => {
    const requests = recordRequests();
    const page = await listPricingRules({ start: 0, end: 20, sort: ['priority'], order: ['asc'] });
    expect(requests.last().url.search).toBe('?_start=0&_end=20&_sort=priority&_order=asc');
    expect(page.total).toBe(1);
    expect(page.data[0]).toMatchObject({
      id: 1,
      scope: 'category',
      target: { name: 'Carrier unlock' },
      kind: 'discount',
      percent: '2.0000',
      isActive: true,
    });
  });

  it('creates a rule with the body as given and reads it back', async () => {
    const requests = recordRequests();
    const created = await createPricingRule(promo);
    expect(requests.last()).toMatchObject({ method: 'POST', body: promo });
    expect(requests.last().url.pathname).toBe('/admin/pricing-rules');
    expect(created).toMatchObject({
      kind: 'promo',
      target: { name: 'Credits' },
      isActive: true,
      endsAt: promo.endsAt,
    });
    expect(await getPricingRule(created.id)).toMatchObject({ priority: 50 });
  });

  it('takes any group id, naming a group the mock does not know "Group #<id>"', async () => {
    const created = await createPricingRule({ ...promo, groupId: 99 });
    expect(created).toMatchObject({ groupId: 99, group: { id: 99, name: 'Group #99' } });
    const known = await createPricingRule({ ...promo, groupId: 3 });
    expect(known.group).toEqual({ id: 3, name: 'VIP' });
    const bad = await createPricingRule({ ...promo, groupId: 0 }).catch((e: unknown) => e);
    expect((bad as ApiError).fieldErrors.groupId).toEqual(['Choose a merchant group.']);
  });

  it('turns a rule off and changes it with a partial body', async () => {
    const requests = recordRequests();
    expect(await updatePricingRule(1, { isActive: false })).toMatchObject({
      isActive: false,
      percent: '2.0000',
    });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { isActive: false } });
    expect(requests.last().url.pathname).toBe('/admin/pricing-rules/1');
    expect(await updatePricingRule(1, { percent: '3.0000' })).toMatchObject({
      percent: '3.0000',
      isActive: false,
    });
  });

  it('refuses a rule with nothing to apply, an end before the start, or an unknown target', async () => {
    const empty = await createPricingRule({ ...promo, percent: '0.0000' }).catch((e: unknown) => e);
    expect((empty as ApiError).fieldErrors.percent).toEqual(['Enter a percent or a fixed amount.']);
    const backwards = await createPricingRule({
      ...promo,
      startsAt: promo.endsAt,
      endsAt: promo.startsAt,
    }).catch((e: unknown) => e);
    expect((backwards as ApiError).fieldErrors.endsAt).toEqual(['The end date is before the start date.']);
    const nowhere = await createPricingRule({ ...promo, targetId: 999 }).catch((e: unknown) => e);
    expect((nowhere as ApiError).fieldErrors.targetId).toEqual(['Choose the category.']);
  });

  it('deletes a rule', async () => {
    const requests = recordRequests();
    await expect(deletePricingRule(1)).resolves.toBeUndefined();
    expect(requests.last()).toMatchObject({ method: 'DELETE' });
    await expect(getPricingRule(1)).rejects.toMatchObject({ status: 404 });
  });
});

describe('the bulk price change', () => {
  const body = { categoryId: CREDITS, change: { type: 'fixed' as const, value: '1' } };

  it('previews the old and new price of every service in the category without saving anything', async () => {
    const requests = recordRequests();
    const preview = await previewBulkPrice(body);
    expect(requests.last()).toMatchObject({ method: 'POST', body });
    expect(requests.last().url.pathname).toBe('/admin/services/bulk-price/preview');
    expect(preview.lines).toHaveLength(3);
    expect(preview.lines.find((line) => line.code === 'SRV-Z3X-10')).toMatchObject({
      oldPrice: '9.3500',
      newPrice: '10.3500',
      floorPrice: '9.1800',
      belowFloor: false,
    });
    expect(preview.belowFloor).toBe(0);
    expect((await getService(15)).basePrice).toBe('9.3500');
  });

  it('flags the services that would fall under their floor', async () => {
    const preview = await previewBulkPrice({
      serviceIds: [15, 16],
      change: { type: 'percent', value: '-50' },
    });
    expect(preview.lines.map((line) => line.belowFloor)).toEqual([true, true]);
    expect(preview.belowFloor).toBe(2);
  });

  it('applies the same body and says how many prices changed', async () => {
    const requests = recordRequests();
    expect(await applyBulkPrice(body)).toEqual({ updated: 3, belowFloor: 0 });
    expect(requests.last()).toMatchObject({ method: 'POST', body });
    expect(requests.last().url.pathname).toBe('/admin/services/bulk-price/apply');
    expect((await getService(15)).basePrice).toBe('10.3500');
  });

  it('refuses a change that would make a price zero, and a body that names no services', async () => {
    const free = await previewBulkPrice({
      categoryId: CREDITS,
      change: { type: 'percent', value: '-100' },
    }).catch((e: unknown) => e);
    expect(free).toMatchObject({ status: 422 });
    await expect(previewBulkPrice({ change: { type: 'percent', value: '5' } })).rejects.toMatchObject({
      status: 422,
    });
  });
});

describe('resolvePrice', () => {
  it('sends the service and the merchant and gets the price with its steps', async () => {
    const requests = recordRequests();
    const resolution = await resolvePrice({ serviceId: ATT, clientId: CAIRO });
    expect(requests.last().url.pathname).toBe('/admin/pricing/resolve');
    expect(Object.fromEntries(requests.last().url.searchParams)).toEqual({ serviceId: '5', clientId: '5' });
    expect(resolution).toMatchObject({
      price: '15.2000',
      source: 'client',
      floor: '14.3100',
      clamped: false,
    });
    expect(resolution.steps.map((step) => [step.id, step.state])).toEqual([
      ['client', 'win'],
      ['group', 'skip'],
      ['base', 'skip'],
      ['category', 'skip'],
      ['discount', 'skip'],
    ]);
  });

  it('works the base price through the category rule for a merchant with no fixed price', async () => {
    const resolution = await resolvePrice({ serviceId: ATT, clientId: ERBIL });
    expect(resolution).toMatchObject({ price: '16.9300', source: 'base', rawPrice: '16.9300' });
    expect(resolution.steps.find((step) => step.id === 'category')).toMatchObject({
      state: 'apply',
      value: -0.02,
    });
    expect(resolution.otherGroups?.map((quote) => [quote.group.name, quote.price])).toEqual([
      ['Standard', '16.9300'],
      ['Wholesale', '16.2600'],
      ['VIP', '15.9000'],
    ]);
  });

  it('answers 404 for a merchant or service that does not exist', async () => {
    await expect(resolvePrice({ serviceId: ATT, clientId: 999 })).rejects.toMatchObject({ status: 404 });
    await expect(resolvePrice({ serviceId: 999, clientId: CAIRO })).rejects.toMatchObject({ status: 404 });
  });
});
