// Tests for the Catalog join of the services mock: the keys a row gets from the suppliers and storefront mocks, the five Catalog filters and
// the shop price sort, the keys left out and the 403 for a session without the permission, and that a change made in the other mocks shows
// in the next read. They run through the API functions against the whole mock server, as the screens do.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createListing, updateListing } from '@/features/storefront';
import { storefrontStore } from '@/features/storefront/mocks/store';
import { replaceSupplierLinks } from '@/features/suppliers';
import { suppliersState } from '@/features/suppliers/mocks';
import { ApiError } from '@/lib/api';
import { roleStore } from '@/mocks/roles';
import { setMockScenario } from '@/mocks/scenario';
import { setupMockApi, signInAs } from '@/test/mockApi';
import type { ServiceListFilters } from '../types';
import {
  createService,
  getService,
  importInventoryCodes,
  listInventoryCodes,
  listServices,
  updateService,
  voidInventoryCodes,
} from '../api';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Records of the mock seed: services 1 to 10 and 13 are on the shop, 11 and 12 are B2B only (off), 14 is switched off, 15 to 27 have no
// shop page (24 to 27 are file services). Prices written by a rule: 1 to 4, 6, 7, 8 and 10. Waiting proposals: 6, 8 and 10. 17 is below its
// floor. Primary suppliers: 3 for 1 to 4, 1 for 5, 6, 10 to 13, 6 for 7 to 9 and 14, 2 for 15 to 19, 4 for 20 to 23, 5 for 24 to 27.
const ATT = 5;
const RULE_PRICED = 6;
const CHIMERA = 17;
const NO_PAGE = 16;
const UNLOCKTOOL = 16; // delivered from code stock: seven codes available
const PLAIN = 18; // no shop page, supplier 2, not delivered from code stock
const ON_SHOP = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13];
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const idsOf = async (filters: ServiceListFilters): Promise<number[]> =>
  (await listServices({ end: 100, filters })).data.map((row) => row.id).sort((a, b) => a - b);

/** Gives the signed-in owner exactly these permissions (the mock server checks them for the Catalog keys and filters). */
const grant = (...permissions: string[]) => roleStore().patch(1, { permissions });

/** A refused publish row for a service, as a failed apply leaves it, in the run `runId`. */
async function refuse(serviceId: number, runId: number, itemId: number, reason = 'below_floor') {
  const { publish } = await storefrontStore();
  const run = publish.runs.find(runId);
  if (!run) throw new Error('No such run.');
  run.items = [
    ...run.items,
    {
      ...publish.template[0],
      id: itemId,
      serviceId,
      result: 'refused',
      resultReason: reason,
      resultDetail: 'Too low.',
    },
  ];
}

describe('the Catalog keys of a row', () => {
  it('give a service with a shop page its price, who wrote it, its page and no reason to look', async () => {
    const [row] = (await listServices({ q: 'AT&T USA Premier' })).data;
    expect(row).toMatchObject({
      id: ATT,
      attention: [],
      retailPrice: '25.9900',
      retailPriceSource: 'manual',
      retailPriceRule: null,
      retailPriceWaiting: false,
      listingId: 5,
      isListed: true,
      shopBlocked: null,
      supplier: { id: 1 },
      fallbackSupplier: { id: 6 },
    });
  });

  it('name the rule of a followed price and flag the proposal that waits for it', async () => {
    const row = await getService(RULE_PRICED);
    expect(row).toMatchObject({
      attention: ['price_proposal'],
      retailPrice: '19.9900',
      retailPriceSource: 'rule',
      retailPriceRule: { id: 3, label: expect.stringContaining('Carrier unlock') as string },
      retailPriceWaiting: true,
      publishFailure: null,
    });
  });

  it('say a service with no shop page has no price and no page, and flag a price under the floor', async () => {
    const row = await getService(CHIMERA);
    expect(row).toMatchObject({
      attention: ['below_floor'],
      retailPrice: null,
      retailPriceSource: null,
      retailPriceRule: null,
      retailPriceWaiting: false,
      listingId: null,
      isListed: false,
      shopBlocked: null,
    });
  });

  it('say why a service cannot go on the shop, in the publish rules order', async () => {
    const blocked = (await listServices({ end: 100 })).data.filter((row) => row.shopBlocked);
    expect(Object.fromEntries(blocked.map((row) => [row.id, row.shopBlocked]))).toEqual({
      11: 'b2b_only',
      12: 'b2b_only',
      14: 'service_disabled',
      24: 'not_orderable',
      25: 'not_orderable',
      26: 'not_orderable',
      27: 'not_orderable',
    });
    // A switched-off service has no reason to look at (it is not live).
    expect((await getService(14)).attention).toEqual([]);
  });

  it('are on the answers of create and change too', async () => {
    const created = await createService({
      name: 'Plain check',
      code: 'IMEI-PLAIN',
      categoryId: 1,
      type: 'imei',
      slaMinutes: 5,
      basePrice: '1.5000',
    });
    // A new automatic service has no supplier link yet.
    expect(created).toMatchObject({
      attention: ['no_supplier'],
      supplier: null,
      listingId: null,
      retailPrice: null,
    });
    const changed = await updateService(ATT, { status: 'disabled' });
    expect(changed).toMatchObject({ attention: [], shopBlocked: 'service_disabled', listingId: 5 });
  });
});

describe('the filters', () => {
  it('needsAttention keeps the services with a reason and drops them when false', async () => {
    expect(await idsOf({ needsAttention: true })).toEqual([6, 8, 10, CHIMERA]);
    expect(await idsOf({ needsAttention: false })).toEqual(
      range(1, 27).filter((id) => ![6, 8, 10, CHIMERA].includes(id)),
    );
  });

  it('hasSupplier and supplierId read the supplier chain (the primary supplier for supplierId)', async () => {
    expect(await idsOf({ hasSupplier: true })).toEqual(range(1, 27));
    expect(await idsOf({ hasSupplier: false })).toEqual([]);
    expect(await idsOf({ supplierId: 2 })).toEqual(range(15, 19));
    expect(await idsOf({ supplierId: 1 })).toEqual([5, 6, 10, 11, 12, 13]);
    expect(await idsOf({ supplierId: 99 })).toEqual([]);
  });

  it('isListed is the shop page that is switched on; notOnShop is an active service nothing blocks and that is not listed', async () => {
    expect(await idsOf({ isListed: true })).toEqual(ON_SHOP);
    expect(await idsOf({ isListed: false })).toEqual(range(1, 27).filter((id) => !ON_SHOP.includes(id)));
    expect(await idsOf({ notOnShop: true })).toEqual(range(15, 23));
    expect((await idsOf({ notOnShop: false })).length).toBe(27 - 9);
  });

  it('combine with the others, and the total follows the filters', async () => {
    expect(await idsOf({ notOnShop: true, type: 'server' })).toEqual(range(15, 19));
    const page = await listServices({ start: 0, end: 1, filters: { needsAttention: true } });
    expect(page.data).toHaveLength(1);
    expect(page.total).toBe(4);
  });

  it('refuse a value that is not true, false or a whole id, and an operator, with 422', async () => {
    for (const filters of [{ isListed: 'maybe' }, { supplierId: 'abc' }, { needsAttention_ne: 'true' }]) {
      const error = await listServices({ filters }).catch((e: unknown) => e);
      expect(error).toMatchObject({ status: 422 });
    }
  });
});

describe('the sort by shop price', () => {
  it('puts the services with no shop price last in both directions, like the server', async () => {
    const ascending = (await listServices({ end: 100, sort: ['retailPrice'], order: ['asc'] })).data;
    const priced = ascending.filter((row) => row.retailPrice !== null);
    expect(priced.map((row) => Number(row.retailPrice))).toEqual(
      priced.map((row) => Number(row.retailPrice)).sort((a, b) => a - b),
    );
    expect(ascending.slice(0, 14).every((row) => row.retailPrice !== null)).toBe(true);
    expect(ascending.slice(14).every((row) => row.retailPrice === null)).toBe(true);
    const descending = (await listServices({ end: 100, sort: ['retailPrice'], order: ['desc'] })).data;
    // Highest price first; the 13 services with no price stay at the end instead of leading the page.
    const pricedDesc = descending.slice(0, 14);
    expect(pricedDesc.every((row) => row.retailPrice !== null)).toBe(true);
    expect(pricedDesc.map((row) => Number(row.retailPrice))).toEqual(
      pricedDesc.map((row) => Number(row.retailPrice)).sort((a, b) => b - a),
    );
    expect(pricedDesc[pricedDesc.length - 1].retailPrice).toBe('3.9900');
    expect(descending.slice(14).every((row) => row.retailPrice === null)).toBe(true);
  });
});

describe('a session without the permission', () => {
  it('with only catalog:read gets no shop keys, no private reasons, and a 403 for the shop filters', async () => {
    grant('catalog:read');
    const [row] = (await listServices({ q: 'T-Mobile' })).data;
    expect(row).toMatchObject({
      id: RULE_PRICED,
      attention: [],
      retailPrice: '19.9900',
      retailPriceSource: 'rule',
    });
    for (const key of ['retailPriceRule', 'retailPriceWaiting', 'listingId', 'isListed', 'shopBlocked']) {
      expect(row).not.toHaveProperty(key);
    }
    expect(await getService(RULE_PRICED)).not.toHaveProperty('publishFailure');
    // Below floor stays visible to everyone; the waiting proposal does not.
    expect(await idsOf({ needsAttention: true })).toEqual([CHIMERA]);
    for (const filters of [{ isListed: true }, { notOnShop: true }, { isListed: false }]) {
      const error = await listServices({ filters }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN' });
    }
    // The other Catalog filters and the sort are open to the role.
    expect(await idsOf({ hasSupplier: true })).toHaveLength(27);
    expect((await listServices({ sort: ['retailPrice'], order: ['asc'] })).data[0].retailPrice).toBe(
      '3.9900',
    );
  });

  it('with pricing:read also gets the rule, the waiting flag and the proposal reason, but still no shop page keys', async () => {
    grant('catalog:read', 'pricing:read');
    const row = await getService(RULE_PRICED);
    expect(row).toMatchObject({ attention: ['price_proposal'], retailPriceWaiting: true });
    expect(row.retailPriceRule).toMatchObject({ id: 3 });
    for (const key of ['listingId', 'isListed', 'shopBlocked', 'publishFailure'])
      expect(row).not.toHaveProperty(key);
    expect(await idsOf({ needsAttention: true })).toEqual([6, 8, 10, CHIMERA]);
    await expect(listServices({ filters: { notOnShop: true } })).rejects.toMatchObject({ status: 403 });
  });

  it('with storefront:read gets the shop page keys and may use the shop filters, but not the pricing keys', async () => {
    grant('catalog:read', 'storefront:read');
    const row = await getService(RULE_PRICED);
    expect(row).toMatchObject({
      attention: [],
      listingId: 6,
      isListed: true,
      shopBlocked: null,
      publishFailure: null,
    });
    for (const key of ['retailPriceRule', 'retailPriceWaiting']) expect(row).not.toHaveProperty(key);
    expect(await idsOf({ notOnShop: true })).toEqual(range(15, 23));
  });

  it('follows the read-only role of the readonly scenario, which may read all three', async () => {
    setMockScenario('readonly');
    expect(await idsOf({ isListed: true })).toEqual(ON_SHOP);
  });
});

describe('what the other mocks do shows in the next read', () => {
  it('a shop page made or switched off moves the service in and out of "not on the shop"', async () => {
    await updateListing(1, { isListed: false });
    expect((await getService(1)).isListed).toBe(false);
    expect(await idsOf({ notOnShop: true })).toEqual([1, ...range(15, 23)]);
    await createListing({ serviceId: NO_PAGE, publicTitle: 'Licence one day' });
    expect(await getService(NO_PAGE)).toMatchObject({
      isListed: false,
      listingId: expect.any(Number) as number,
    });
    expect(await idsOf({ notOnShop: true })).toEqual([1, ...range(15, 23)]);
    await updateListing(1, { isListed: true });
    expect(await idsOf({ isListed: true })).toEqual(ON_SHOP);
  });

  it('a supplier chain saved on the Suppliers page changes the supplier cells, the filters and the no-supplier reason', async () => {
    const data = await suppliersState();
    const own = data.catalogue.list().find((item) => item.supplierId === 6 && !item.imported);
    if (!own) throw new Error('The seed has a supplier 6 service that is not imported.');
    await replaceSupplierLinks(PLAIN, { links: [{ supplierServiceId: own.id, priority: 1 }] });
    expect(await getService(PLAIN)).toMatchObject({ supplier: { id: 6 }, fallbackSupplier: null });
    expect(await idsOf({ supplierId: 6 })).toContain(PLAIN);
    expect(await idsOf({ supplierId: 2 })).toEqual([15, 16, 17, 19]);
    await replaceSupplierLinks(PLAIN, { links: [] });
    expect(await getService(PLAIN)).toMatchObject({ supplier: null, attention: ['no_supplier'] });
    expect(await idsOf({ hasSupplier: false })).toEqual([PLAIN]);
    expect(await idsOf({ needsAttention: true })).toEqual([6, 8, 10, CHIMERA, PLAIN]);
  });

  it('a service delivered from code stock is supplied by its codes: no_supplier only while none is available', async () => {
    await replaceSupplierLinks(UNLOCKTOOL, { links: [] });
    // Seven codes are available: no supplier, and still nothing to look at.
    expect(await getService(UNLOCKTOOL)).toMatchObject({ supplier: null, stockAvailable: 7, attention: [] });
    expect(await idsOf({ needsAttention: true })).not.toContain(UNLOCKTOOL);
    const available = (await listInventoryCodes({ filters: { serviceId: UNLOCKTOOL, status: 'available' } }))
      .data;
    await voidInventoryCodes({ ids: available.slice(1).map((code) => code.id) });
    // One code left is still supply.
    expect(await getService(UNLOCKTOOL)).toMatchObject({ stockAvailable: 1, attention: [] });
    await voidInventoryCodes({ ids: [available[0].id] });
    expect(await getService(UNLOCKTOOL)).toMatchObject({ stockAvailable: 0, attention: ['no_supplier'] });
    expect(await idsOf({ needsAttention: true })).toContain(UNLOCKTOOL);
    // New codes make it supplied again, and the list rows say the same as the record.
    await importInventoryCodes(UNLOCKTOOL, { codes: ['UT-9001-ZZZ1'] });
    expect((await listServices({ q: 'UnlockTool' })).data[0]).toMatchObject({
      stockAvailable: 1,
      attention: [],
    });
  });

  it('the codes of a service that is not delivered from code stock are no supply (it holds none)', async () => {
    await replaceSupplierLinks(PLAIN, { links: [] });
    await expect(importInventoryCodes(PLAIN, { codes: ['PLN-0001-AAAA'] })).rejects.toMatchObject({
      status: 422,
    });
    expect((await getService(PLAIN)).attention).toEqual(['no_supplier']);
  });

  it('a manual service with no supplier is not flagged', async () => {
    await replaceSupplierLinks(11, { links: [] });
    expect((await getService(11)).attention).toEqual([]);
    expect(await idsOf({ hasSupplier: false })).toEqual([11]);
  });

  it('a refused publish row without a shop page is a failure until a shop page exists or a later row ends another way', async () => {
    await refuse(NO_PAGE, 1, 900);
    const row = await getService(NO_PAGE);
    expect(row.attention).toEqual(['publish_failed']);
    expect(row.publishFailure).toMatchObject({ runId: 1, reason: 'below_floor', detail: 'Too low.' });
    expect(new Date(row.publishFailure?.at ?? '').getTime()).not.toBeNaN();
    expect(await idsOf({ needsAttention: true })).toEqual([6, 8, 10, NO_PAGE, CHIMERA]);

    // A later row of any other result clears it (run 2 finished with run 1, so the newer run wins).
    const { publish } = await storefrontStore();
    const second = publish.runs.find(2);
    if (!second) throw new Error('No such run.');
    second.items = [
      ...second.items,
      { ...publish.template[0], id: 901, serviceId: NO_PAGE, result: 'skipped', resultReason: 'left_out' },
    ];
    expect(await getService(NO_PAGE)).toMatchObject({ attention: [], publishFailure: null });

    // A refusal that is newest again comes back, and a shop page made by hand clears it for good, even when it is switched off after.
    await refuse(NO_PAGE, 7, 902, 'cost_moved');
    expect((await getService(NO_PAGE)).publishFailure).toMatchObject({ runId: 7, reason: 'cost_moved' });
    await createListing({ serviceId: NO_PAGE, publicTitle: 'Licence one day' });
    expect(await getService(NO_PAGE)).toMatchObject({ attention: [], publishFailure: null });
    await updateListing((await getService(NO_PAGE)).listingId as number, { isListed: false });
    expect(await getService(NO_PAGE)).toMatchObject({ attention: [], publishFailure: null });
  });

  it('keeps the publish failure out of sight of a session without storefront:read', async () => {
    await refuse(NO_PAGE, 1, 900);
    grant('catalog:read', 'pricing:read');
    expect((await getService(NO_PAGE)).attention).toEqual([]);
    expect(await idsOf({ needsAttention: true })).toEqual([6, 8, 10, CHIMERA]);
  });
});
