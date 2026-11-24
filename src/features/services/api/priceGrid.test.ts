// Tests for the price grid and the order of services (`GET /admin/services/price-grid`, `POST /admin/services/order`), run against the dev mock API:
// each function reaches its route with the body of the contract, and the mock plays the server (the figures of a row, the filters, the order
// merchants see, the refusals of the order route). The mock's own prices are the ones the Pricing view prints.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { roleStore } from '@/mocks/roles';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { createService, listPriceGrid, orderServices, replaceServiceGroupPrices, updateService } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const ATT = 5; // AT&T USA Premier Unlock: a typed shop price and a fixed price for VIP
const APPLE_WARRANTY = 2; // a shop price that follows a rule
const CARRIER_UNLOCK = 4; // a category with six services

/** The refusal an API function threw. */
const refusal = (error: unknown) => error as ApiError;

describe('listPriceGrid', () => {
  it('reads a page of the services of a kind by name, with the total', async () => {
    const requests = recordRequests();
    const page = await listPriceGrid({
      start: 0,
      end: 5,
      sort: ['name'],
      order: ['asc'],
      filters: { type: 'imei' },
    });
    expect(requests.last().url.pathname).toBe('/admin/services/price-grid');
    expect(requests.last().url.searchParams.get('type')).toBe('imei');
    expect(requests.last().url.searchParams.get('_end')).toBe('5');
    expect(page.total).toBe(14);
    expect(page.data.map((row) => row.name)).toEqual([
      'Apple Warranty & Activation Date',
      'AT&T USA Premier Unlock',
      'Blacklist Status (GSMA)',
      'EE UK Unlock',
      'iCloud Clean / Lost Check',
    ]);
  });

  it('gives every figure of a row the server works out: cost, margins, floor, the shop price and one price per rank', async () => {
    const { data } = await listPriceGrid({ q: 'AT&T' });
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: ATT,
      name: 'AT&T USA Premier Unlock',
      code: 'IMEI-ATT-USA',
      status: 'active',
      sort: 0,
      cost: '13.5000',
      costChangedFrom: null,
      basePrice: '17.2800',
      baseMargin: '3.7800',
      floorPrice: '14.3100',
      belowFloor: false,
      retailPrice: '25.9900',
      retailPriceSource: 'manual',
      retailMargin: '12.4900',
    });
    expect(data[0]?.supplier).toEqual({ id: expect.any(Number), name: expect.any(String) });
    // The carrier rule takes 2% off, Wholesale 4% more; VIP has a fixed price.
    expect(data[0]?.groupPrices).toEqual([
      { groupId: 1, fixedPrice: null, price: '16.9300', margin: '3.4300' },
      { groupId: 2, fixedPrice: null, price: '16.2600', margin: '2.7600' },
      { groupId: 3, fixedPrice: '15.9000', price: '15.9000', margin: '2.4000' },
    ]);
  });

  it('says where a shop price comes from, and when the cost moved or the price is under its floor', async () => {
    expect((await listPriceGrid({ q: 'Apple Warranty' })).data[0]).toMatchObject({
      id: APPLE_WARRANTY,
      retailPriceSource: 'rule',
    });
    expect((await listPriceGrid({ q: 'Chimera' })).data[0]).toMatchObject({
      cost: '19.8000',
      costChangedFrom: '17.0000',
      basePrice: '19.5000',
      baseMargin: '-0.3000',
      belowFloor: true,
    });
  });

  it('filters by kind, group and status, and searches the name, the code and the group name', async () => {
    expect((await listPriceGrid({ filters: { type: 'server' } })).total).toBe(5);
    expect((await listPriceGrid({ filters: { type: 'imei', categoryId: CARRIER_UNLOCK } })).total).toBe(6);
    const off = await listPriceGrid({ filters: { status: 'disabled' } });
    expect(off.data.map((row) => row.name)).toEqual(['Xiaomi Mi Account Clean']);
    expect((await listPriceGrid({ q: 'SRV-Z3X' })).data.map((row) => row.code)).toEqual(['SRV-Z3X-10']);
    expect((await listPriceGrid({ q: 'Carrier', filters: { type: 'imei' } })).total).toBe(6);
  });

  it('leaves a margin and the cost empty for a service with no cost on record', async () => {
    const created = await createService({
      name: 'Fresh unlock',
      code: 'FRESH-1',
      categoryId: CARRIER_UNLOCK,
      type: 'imei',
      slaMinutes: 60,
      basePrice: '5.0000',
    });
    const row = (await listPriceGrid({ q: 'FRESH-1' })).data[0];
    expect(row).toMatchObject({
      id: created.id,
      cost: null,
      costChangedFrom: null,
      baseMargin: null,
      retailPrice: null,
      retailPriceSource: null,
      retailMargin: null,
    });
    expect(row?.groupPrices.every((cell) => cell.margin === null)).toBe(true);
  });

  it('shows what the existing routes saved: a new base price with its margin, a fixed price for a group, a typed shop price', async () => {
    await updateService(ATT, { basePrice: '18.5000' });
    // The shop group is not one of the ranks; a row of an unknown group is the shop's (the accounts feature owns the groups).
    await replaceServiceGroupPrices(ATT, {
      prices: [
        { groupId: 1, price: '17.1000' },
        { groupId: 4, price: '27.0000' },
      ],
      retailPriceSeen: '25.9900',
    });
    const row = (await listPriceGrid({ q: 'AT&T' })).data[0];
    expect(row).toMatchObject({ basePrice: '18.5000', baseMargin: '5.0000' });
    expect(row?.groupPrices[0]).toEqual({
      groupId: 1,
      fixedPrice: '17.1000',
      price: '17.1000',
      margin: '3.6000',
    });
    expect(row?.groupPrices[2]?.fixedPrice).toBeNull();
    expect(row).toMatchObject({
      retailPrice: '27.0000',
      retailPriceSource: 'manual',
      retailMargin: '13.5000',
    });
  });

  it('does not turn a shop price nobody touched into a typed one', async () => {
    await replaceServiceGroupPrices(APPLE_WARRANTY, {
      prices: [{ groupId: 4, price: '3.9900' }],
      retailPriceSeen: '3.9900',
    });
    expect((await listPriceGrid({ q: 'Apple Warranty' })).data[0]).toMatchObject({
      retailPrice: '3.9900',
      retailPriceSource: 'rule',
    });
  });
});

describe('orderServices', () => {
  it('stores positions and answers how many services moved; the same positions again move none', async () => {
    const requests = recordRequests();
    expect(await orderServices({ items: [{ id: APPLE_WARRANTY, sort: 5 }] })).toEqual({ updated: 1 });
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: { items: [{ id: APPLE_WARRANTY, sort: 5 }] },
    });
    expect(requests.last().url.pathname).toBe('/admin/services/order');
    expect(await orderServices({ items: [{ id: APPLE_WARRANTY, sort: 5 }] })).toEqual({ updated: 0 });
  });

  it('reads back in the order merchants see: category position, then the stored position, then the name', async () => {
    const ids = async () =>
      (await listPriceGrid({ sort: ['sort'], order: ['asc'], filters: { type: 'imei' } })).data
        .slice(0, 4)
        .map((row) => row.id);
    // The Apple category: Apple Warranty (2), iCloud Clean (1), iCloud Lost (12), MDM (11), all at position 0, so by name.
    expect(await ids()).toEqual([2, 1, 12, 11]);
    await orderServices({ items: [{ id: APPLE_WARRANTY, sort: 5 }] });
    expect(await ids()).toEqual([1, 12, 11, 2]);
    expect((await listPriceGrid({ q: 'Apple Warranty' })).data[0]?.sort).toBe(5);
  });

  it('refuses the whole call and names the item: an unknown service, one listed twice, a position out of range', async () => {
    const unknown = refusal(
      await orderServices({ items: [{ id: 999, sort: 1 }] }).catch((error: unknown) => error),
    );
    expect(unknown.status).toBe(422);
    expect(unknown.fieldErrors['items.0.id']).toEqual(['No service has this id.']);

    const twice = refusal(
      await orderServices({
        items: [
          { id: ATT, sort: 1 },
          { id: ATT, sort: 2 },
        ],
      }).catch((error: unknown) => error),
    );
    expect(twice.fieldErrors['items.1.id']).toEqual(['Listed twice.']);

    const far = refusal(
      await orderServices({ items: [{ id: ATT, sort: 1_000_001 }] }).catch((error: unknown) => error),
    );
    expect(far.fieldErrors['items.0.sort']).toEqual(['Use at most 1000000.']);

    const none = refusal(await orderServices({ items: [] }).catch((error: unknown) => error));
    expect(none.fieldErrors.items).toEqual(['Send at least one service.']);
    // Nothing was saved by any of them.
    expect((await listPriceGrid({ q: 'AT&T' })).data[0]?.sort).toBe(0);
  });

  it('says what is wrong with a position or the size of the call in the words of the backend contract', async () => {
    const below = refusal(
      await orderServices({ items: [{ id: ATT, sort: -1 }] }).catch((error: unknown) => error),
    );
    expect(below.fieldErrors['items.0.sort']).toEqual(['Enter 0 or more.']);

    const fraction = refusal(
      await orderServices({ items: [{ id: ATT, sort: 1.5 }] }).catch((error: unknown) => error),
    );
    expect(fraction.fieldErrors['items.0.sort']).toEqual(['Enter a whole number.']);

    const many = refusal(
      await orderServices({ items: Array.from({ length: 501 }, () => ({ id: ATT, sort: 1 })) }).catch(
        (error: unknown) => error,
      ),
    );
    expect(many.fieldErrors.items).toEqual(['Send at most 500 services at a time.']);
  });

  it('is refused with 403 for a session without catalog:update, and saves nothing', async () => {
    roleStore().patch(1, { permissions: ['catalog:read', 'pricing:read'] });
    const error = refusal(
      await orderServices({ items: [{ id: ATT, sort: 3 }] }).catch((thrown: unknown) => thrown),
    );
    expect(error.status).toBe(403);
    expect(error.detail).toBe('You need the catalog:update permission to change the order of services.');
    expect((await listPriceGrid({ q: 'AT&T' })).data[0]?.sort).toBe(0);
  });
});
