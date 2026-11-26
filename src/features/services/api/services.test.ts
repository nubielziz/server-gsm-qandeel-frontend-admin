// Tests for the catalog API functions (services, their parts, categories), run against the dev mock API: each one reaches its route with the
// body of its assumed contract and reads the answer the way the screens do. The mock plays the server, so a change can be checked by
// reading the record again.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { servicesStore } from '../mocks/store';
import { recordRequests } from '../test/requests';
import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  getCategory,
  getService,
  importInventoryCodes,
  listCategories,
  listInventoryCodes,
  listServices,
  replaceServiceFields,
  replaceServiceGroupPrices,
  servicesResources,
  updateCategory,
  updateService,
  voidInventoryCodes,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Records of the mock seed (taken from the demo; see mocks/seed.ts).
const ATT = 5; // AT&T USA Premier Unlock: cost 13.50, minimum profit 0.81, price 17.28, a VIP group price
const CHIMERA = 17; // priced under its floor
const Z3X = 15; // has orders and a custom field
const APPLE = 1; // a category with four services

describe('listServices', () => {
  it('sends the range, sort, search and filters and reads the total from the header', async () => {
    const requests = recordRequests();
    const page = await listServices({
      start: 0,
      end: 5,
      sort: ['basePrice'],
      order: ['desc'],
      q: 'unlock',
      filters: { type: 'imei', status: 'active' },
    });
    const { method, url } = requests.last();
    expect(method).toBe('GET');
    expect(url.pathname).toBe('/admin/services');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      _start: '0',
      _end: '5',
      _sort: 'basePrice',
      _order: 'desc',
      q: 'unlock',
      type: 'imei',
      status: 'active',
    });
    expect(page.data).toHaveLength(5);
    expect(page.total).toBeGreaterThan(5);
    expect(Number(page.data[0].basePrice)).toBeGreaterThanOrEqual(Number(page.data[1].basePrice));
  });

  it('gives the figures the server worked out: floor, margin and below floor', async () => {
    const [chimera] = (await listServices({ q: 'Chimera' })).data;
    expect(chimera).toMatchObject({
      id: CHIMERA,
      code: 'SRV-CHM-1M',
      type: 'server',
      status: 'active',
      executionMode: 'auto',
      basePrice: '19.5000',
      cost: '19.8000',
      costChangedFrom: '17.0000',
      minProfit: '1.1900',
      floorPrice: '20.9900',
      belowFloor: true,
      slaMinutes: 10,
      category: { name: 'Licenses' },
      supplier: { name: 'Gulf Server Hub' },
      fallbackSupplier: null,
    });
    expect(Number(chimera.marginPct)).toBeLessThan(0);
  });

  it('filters the services below their floor, and counts them with a one-row call', async () => {
    const below = await listServices({ start: 0, end: 1, filters: { belowFloor: true, status: 'active' } });
    expect(below.total).toBe(1);
    expect(below.data[0].id).toBe(CHIMERA);
    expect((await listServices({ start: 0, end: 1 })).total).toBe(27);
  });

  it('sends the Catalog filters and the shop price sort as plain keys, and counts with them', async () => {
    const requests = recordRequests();
    const attention = await listServices({
      start: 0,
      end: 1,
      sort: ['retailPrice'],
      order: ['desc'],
      filters: { needsAttention: true, hasSupplier: true, supplierId: 2, isListed: false, notOnShop: true },
    });
    expect(Object.fromEntries(requests.last().url.searchParams)).toEqual({
      _start: '0',
      _end: '1',
      _sort: 'retailPrice',
      _order: 'desc',
      needsAttention: 'true',
      hasSupplier: 'true',
      supplierId: '2',
      isListed: 'false',
      notOnShop: 'true',
    });
    expect(attention.total).toBe(1);
    expect((await listServices({ start: 0, end: 1, filters: { needsAttention: true } })).total).toBe(4);
    expect((await listServices({ start: 0, end: 1, filters: { notOnShop: true } })).total).toBe(9);
  });

  it('gives each row its attention reasons and shop figures', async () => {
    const rows = (await listServices({ end: 100 })).data;
    expect(rows.find((row) => row.id === CHIMERA)).toMatchObject({
      attention: ['below_floor'],
      retailPrice: null,
    });
    expect(rows.find((row) => row.id === ATT)).toMatchObject({
      attention: [],
      retailPrice: '25.9900',
      isListed: true,
    });
  });
});

describe('getService', () => {
  it('reads one service with its fields and group prices; the option lists the server still sends are empty', async () => {
    const att = await getService(ATT);
    expect(att).toMatchObject({
      id: ATT,
      name: 'AT&T USA Premier Unlock',
      groupPrices: [{ groupId: 3, price: '15.9000' }],
      fields: [],
    });
    expect(att.options).toEqual([]);
    expect((await getService(Z3X)).fields).toMatchObject([
      { key: 'account', fieldType: 'text', required: true },
    ]);
  });

  it('carries the shop page, the shop price and the failed publish (none here) of the service', async () => {
    expect(await getService(ATT)).toMatchObject({
      attention: [],
      retailPrice: '25.9900',
      retailPriceSource: 'manual',
      listingId: 5,
      isListed: true,
      shopBlocked: null,
      publishFailure: null,
    });
  });

  it('fails with a 404 problem for a service that does not exist', async () => {
    await expect(getService(9999)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('createService', () => {
  const body = {
    name: 'New Check',
    code: 'IMEI-NEW-1',
    categoryId: APPLE,
    type: 'imei' as const,
    slaMinutes: 15,
    basePrice: '2.5000',
  };

  it('posts the body and gets the new service back, with its floor worked out', async () => {
    const requests = recordRequests();
    const created = await createService(body);
    expect(requests.last()).toMatchObject({ method: 'POST', body });
    expect(requests.last().url.pathname).toBe('/admin/services');
    expect(created).toMatchObject({
      name: 'New Check',
      code: 'IMEI-NEW-1',
      status: 'active',
      floorPrice: '0.0000',
    });
    expect((await getService(created.id)).slaMinutes).toBe(15);
  });

  it('gives an IMEI service made by hand the default IMEI field, and the other types none', async () => {
    const created = await createService(body);
    expect((await getService(created.id)).fields).toEqual([
      {
        key: 'imei',
        name: 'IMEI',
        label: 'IMEI',
        fieldType: 'imei',
        required: true,
        options: [],
        regex: '',
        isMainInput: true,
      },
    ]);
    for (const type of ['server', 'remote', 'file'] as const) {
      const other = await createService({ ...body, code: `NEW-${type}`, type });
      expect((await getService(other.id)).fields).toEqual([]);
    }
  });

  it('refuses a code that is taken, naming the field', async () => {
    const error = await createService({ ...body, code: 'IMEI-ATT-USA' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CODE_TAKEN' });
    expect((error as ApiError).fieldErrors.code[0]).toMatch(/already used by AT&T USA Premier Unlock/);
  });
});

describe('the code stock fields', () => {
  const body = {
    name: 'iTunes Gift Card 10',
    code: 'GC-ITUNES-10',
    categoryId: APPLE,
    type: 'server' as const,
    slaMinutes: 1,
    basePrice: '10.0000',
  };
  const UT = 16; // UnlockTool 1-Day License: seven codes available, four sold, one void

  it('gives every row whether it is delivered from code stock, its available codes and its own cost', async () => {
    expect((await listServices({ q: 'Z3X' })).data[0]).toMatchObject({
      id: Z3X,
      stockDelivery: true,
      stockAvailable: 13,
      ownCost: '8.5000',
      cost: '8.5000',
    });
    expect(await getService(UT)).toMatchObject({ stockDelivery: true, stockAvailable: 7 });
    expect(await getService(ATT)).toMatchObject({
      stockDelivery: false,
      stockAvailable: 0,
      ownCost: '13.5000',
    });
  });

  it('seeds the own cost of a service that has a supplier with the supplier’s cost, as the server’s import does', async () => {
    const rows = (await listServices({ end: 100 })).data;
    // Every demo service has a supplier link, so every one starts with its own cost equal to the cost used.
    expect(rows.length).toBeGreaterThan(20);
    for (const row of rows) expect(row.ownCost).toBe(row.cost);
    // A service made by hand has none until staff type one.
    const own = await createService({ ...body, name: 'Own', code: 'GC-OWN' });
    expect(own.ownCost).toBe('0.0000');
  });

  it('keeps the services that are, or are not, delivered from code stock with the stockDelivery filter', async () => {
    const stock = (await listServices({ end: 100, filters: { stockDelivery: true } })).data;
    expect(stock.map((row) => row.id).sort((a, b) => a - b)).toEqual([Z3X, UT]);
    const rest = await listServices({ end: 100, filters: { stockDelivery: false } });
    expect(rest.total).toBe(25);
    expect(rest.data.some((row) => row.stockDelivery)).toBe(false);
    // The kind and the total follow it, like any other filter.
    const kind = await listServices({ filters: { stockDelivery: true, type: 'imei' } });
    expect(kind).toMatchObject({ data: [], total: 0 });
    expect((await listServices({ start: 0, end: 1, filters: { stockDelivery: true } })).total).toBe(2);
    const error = await listServices({ filters: { stockDelivery: 'maybe' } }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 422 });
  });

  it('creates a service with the two new keys, and without them as the server starts a service', async () => {
    const requests = recordRequests();
    const stock = await createService({ ...body, stockDelivery: true, ownCost: '4.7000' });
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: { stockDelivery: true, ownCost: '4.7000' },
    });
    expect(stock).toMatchObject({
      stockDelivery: true,
      stockAvailable: 0,
      ownCost: '4.7000',
      cost: '4.7000',
    });
    const plain = await createService({ ...body, name: 'Plain', code: 'GC-PLAIN' });
    expect(plain).toMatchObject({
      stockDelivery: false,
      stockAvailable: 0,
      ownCost: '0.0000',
      cost: '0.0000',
    });
  });

  it('uses the larger of the own cost and the supplier’s cost as the cost, and the floor starts from it', async () => {
    expect(await updateService(ATT, { ownCost: '5.0000' })).toMatchObject({
      ownCost: '5.0000',
      cost: '13.5000',
      floorPrice: '14.3100',
    });
    expect(await updateService(ATT, { ownCost: '20.0000' })).toMatchObject({
      ownCost: '20.0000',
      cost: '20.0000',
      floorPrice: '20.8100',
      belowFloor: true,
    });
    expect(await updateService(ATT, { ownCost: '0' })).toMatchObject({ ownCost: '0.0000', cost: '13.5000' });
  });

  it('refuses an own cost below zero or that is not an amount, on its own field', async () => {
    for (const ownCost of ['-1', 'abc']) {
      const error = await updateService(ATT, { ownCost }).catch((e: unknown) => e);
      expect(error).toMatchObject({ status: 422 });
      expect((error as ApiError).fieldErrors.ownCost).toEqual(['Enter an amount, 0 or more.']);
    }
    expect((await getService(ATT)).ownCost).toBe('13.5000');
  });

  it('keeps the first older cost in costChangedFrom when the cost used rises, and not when it falls', async () => {
    const made = await createService({ ...body, name: 'Cost Check', code: 'GC-COST', ownCost: '5.0000' });
    expect(made.costChangedFrom).toBeNull();
    // A fall changes nothing.
    expect(await updateService(made.id, { ownCost: '4.0000' })).toMatchObject({
      cost: '4.0000',
      costChangedFrom: null,
    });
    // A rise keeps the cost used before it; a second rise keeps the first.
    expect(await updateService(made.id, { ownCost: '6.0000' })).toMatchObject({
      cost: '6.0000',
      costChangedFrom: '4.0000',
    });
    expect(await updateService(made.id, { ownCost: '9.0000' })).toMatchObject({
      cost: '9.0000',
      costChangedFrom: '4.0000',
    });
    // A fall afterwards leaves the mark, and a change that does not move the cost used does too.
    expect(await updateService(made.id, { ownCost: '8.0000' })).toMatchObject({ costChangedFrom: '4.0000' });
    expect(await updateService(made.id, { status: 'disabled' })).toMatchObject({ costChangedFrom: '4.0000' });
    // Saving a base price answers "the cost changed": the mark goes.
    expect(await updateService(made.id, { basePrice: '20.0000' })).toMatchObject({
      cost: '8.0000',
      costChangedFrom: null,
    });
  });

  it('does not mark a rise of the own cost that stays under the supplier’s cost', async () => {
    // The Z3X credits cost 8.50 at the supplier: an own cost of 9 raises the cost used, one of 7 does not.
    expect(await updateService(Z3X, { ownCost: '7.0000' })).toMatchObject({
      cost: '8.5000',
      costChangedFrom: null,
    });
    expect(await updateService(Z3X, { ownCost: '9.0000' })).toMatchObject({
      cost: '9.0000',
      costChangedFrom: '8.5000',
    });
  });

  it('clears the mark when a base price is sent with the own cost, whatever the order of the keys', async () => {
    const made = await createService({ ...body, name: 'Cost Check', code: 'GC-COST', ownCost: '5.0000' });
    expect(await updateService(made.id, { ownCost: '6.0000', basePrice: '20.0000' })).toMatchObject({
      cost: '6.0000',
      costChangedFrom: null,
    });
  });

  it('turns the stock switch on and off for a service with no codes', async () => {
    expect(await updateService(ATT, { stockDelivery: true })).toMatchObject({ stockDelivery: true });
    expect(await updateService(ATT, { stockDelivery: false })).toMatchObject({ stockDelivery: false });
  });

  it('refuses to turn the switch off while codes are in stock, with the code codes_in_stock and the count', async () => {
    const error = await updateService(Z3X, { stockDelivery: false }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    expect((error as ApiError).fieldErrors.stockDelivery).toEqual(['Void the 13 codes in stock first.']);
    expect((error as ApiError).fieldCodes.stockDelivery).toEqual(['codes_in_stock']);
    expect((await getService(Z3X)).stockDelivery).toBe(true);
  });

  it('says "1 code" and "3 codes" in that refusal, as the server does', async () => {
    await updateService(ATT, { stockDelivery: true });
    const refusal = async () =>
      ((await updateService(ATT, { stockDelivery: false }).catch((e: unknown) => e)) as ApiError).fieldErrors
        .stockDelivery;
    await importInventoryCodes(ATT, { codes: ['ATT-0001-AAAA'] });
    expect(await refusal()).toEqual(['Void the 1 code in stock first.']);
    await importInventoryCodes(ATT, { codes: ['ATT-0002-BBBB', 'ATT-0003-CCCC'] });
    expect(await refusal()).toEqual(['Void the 3 codes in stock first.']);
  });

  it('lets the switch go off once the codes in stock are void, and counts only available codes', async () => {
    const ids = (await listInventoryCodes({ filters: { serviceId: Z3X, status: 'available' } })).data.map(
      (code) => code.id,
    );
    expect(ids).toHaveLength(13);
    await voidInventoryCodes({ ids });
    expect(await getService(Z3X)).toMatchObject({ stockAvailable: 0, stockDelivery: true });
    expect(await updateService(Z3X, { stockDelivery: false })).toMatchObject({ stockDelivery: false });
  });

  it('refuses an import for a service that is not delivered from code stock, on the codes field', async () => {
    const error = await importInventoryCodes(ATT, { codes: ['ATT-0001-AAAA'] }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 422 });
    expect((error as ApiError).fieldErrors.codes).toEqual([
      'Turn on Delivered from code stock for this service first.',
    ]);
    expect((error as ApiError).fieldCodes.codes).toEqual(['not_stock_service']);
    expect((await listInventoryCodes({ filters: { serviceId: ATT } })).total).toBe(0);
  });

  it('takes the import once the switch is on, and counts the new codes as available', async () => {
    await updateService(ATT, { stockDelivery: true });
    expect(await importInventoryCodes(ATT, { codes: ['ATT-0001-AAAA', 'ATT-0002-BBBB'] })).toMatchObject({
      imported: 2,
    });
    expect(await getService(ATT)).toMatchObject({ stockDelivery: true, stockAvailable: 2 });
  });
});

describe('the quantity keys', () => {
  const body = {
    name: 'Quantity Check',
    code: 'QTY-API-1',
    categoryId: APPLE,
    type: 'imei' as const,
    slaMinutes: 15,
    basePrice: '2.5000',
  };

  it('sends every service as one per order unless told otherwise', async () => {
    const created = await createService(body);
    expect(created).toMatchObject({ minQty: 1, maxQty: 1, qtyOptions: [] });
  });

  it('stores packs sorted and takes the smallest and largest from them', async () => {
    const created = await createService({ ...body, code: 'QTY-API-2', qtyOptions: [25, 5, 10] });
    expect(created).toMatchObject({ minQty: 5, maxQty: 25, qtyOptions: [5, 10, 25] });
  });

  it('leaves the rule alone when a change does not send it, and clears the packs with an empty list', async () => {
    await updateService(ATT, { qtyOptions: [10, 5] });
    expect(await updateService(ATT, { status: 'disabled' })).toMatchObject({
      minQty: 5,
      qtyOptions: [5, 10],
    });
    expect(await updateService(ATT, { minQty: 1, maxQty: 9, qtyOptions: [] })).toMatchObject({
      minQty: 1,
      maxQty: 9,
      qtyOptions: [],
    });
  });

  it('refuses a largest quantity below the smallest, naming the key that was sent', async () => {
    const error = await updateService(ATT, { minQty: 5, maxQty: 2 }).catch((e: unknown) => e);
    expect((error as ApiError).fieldErrors.maxQty[0]).toBe(
      'The largest quantity cannot be below the smallest (5).',
    );
    const only = await updateService(ATT, { minQty: 5 }).catch((e: unknown) => e);
    expect(only).toMatchObject({ status: 422 });
    expect((only as ApiError).fieldErrors.minQty[0]).toBe(
      'The smallest quantity cannot be above the largest (1).',
    );
  });

  it('refuses a smallest quantity that is not the smallest pack, and bad packs', async () => {
    const error = await createService({ ...body, code: 'QTY-API-3', qtyOptions: [5, 10], minQty: 1 }).catch(
      (e: unknown) => e,
    );
    expect((error as ApiError).fieldErrors.minQty[0]).toMatch(/^This service sells fixed packs/);
    const repeated = await updateService(ATT, { qtyOptions: [5, 5] }).catch((e: unknown) => e);
    expect((repeated as ApiError).fieldErrors.qtyOptions[0]).toBe('The pack size 5 is repeated.');
  });
});

describe('updateService', () => {
  it('patches only the fields it is given', async () => {
    const requests = recordRequests();
    const updated = await updateService(ATT, { status: 'disabled' });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { status: 'disabled' } });
    expect(requests.last().url.pathname).toBe('/admin/services/5');
    expect(updated).toMatchObject({ status: 'disabled', basePrice: '17.2800' });
  });

  it('switches the execution mode', async () => {
    expect((await updateService(ATT, { executionMode: 'manual' })).executionMode).toBe('manual');
  });

  it('returns the floor and margin after a price change', async () => {
    expect(await updateService(ATT, { basePrice: '15.0000' })).toMatchObject({
      basePrice: '15.0000',
      floorPrice: '14.3100',
      marginPct: '10.0000',
      belowFloor: false,
    });
  });

  it('refuses a price under the floor with a message on the price field', async () => {
    const error = await updateService(ATT, { basePrice: '14.0000' }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 422 });
    expect((error as ApiError).fieldErrors.basePrice).toEqual([
      'Below the floor. Cost $13.50 plus minimum profit $0.81 is $14.31.',
    ]);
  });
});

describe('deleteService', () => {
  it('refuses a service that has orders, with the reason', async () => {
    await expect(deleteService(Z3X)).rejects.toMatchObject({ status: 409, code: 'SERVICE_IN_USE' });
  });

  it('deletes a service nobody ordered', async () => {
    const created = await createService({
      name: 'Spare',
      code: 'SPARE-1',
      categoryId: APPLE,
      type: 'file',
      slaMinutes: 1,
      basePrice: '1.0000',
    });
    const requests = recordRequests();
    await expect(deleteService(created.id)).resolves.toBeUndefined();
    expect(requests.last()).toMatchObject({ method: 'DELETE' });
    expect(requests.last().url.pathname).toBe(`/admin/services/${created.id}`);
    await expect(getService(created.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('the parts of a service', () => {
  it('replaces the custom fields, in order, and the server makes the key of a new one from its name', async () => {
    const requests = recordRequests();
    const fields = [
      {
        key: 'account',
        name: 'user',
        label: 'Z3X account',
        fieldType: 'text' as const,
        required: true,
        options: [],
        regex: '^\\d+$',
        isMainInput: false,
      },
      {
        name: 'Plan',
        label: '',
        fieldType: 'select' as const,
        required: false,
        options: ['1', '2'],
        regex: '',
        isMainInput: true,
      },
    ];
    const saved = await replaceServiceFields(Z3X, { fields });
    expect(saved).toEqual([{ ...fields[0] }, { ...fields[1], key: 'plan', label: 'Plan' }]);
    expect(requests.last()).toMatchObject({ method: 'PUT', body: { fields } });
    expect(requests.last().url.pathname).toBe('/admin/services/15/fields');
    expect((await getService(Z3X)).fields).toEqual(saved);
  });

  it('gives a new field with a taken key base the next free key, and keeps the saved key when the name changes', async () => {
    const saved = await replaceServiceFields(Z3X, {
      fields: [
        { key: 'account', name: 'Account name', fieldType: 'text', required: false, options: [], regex: '' },
        { name: 'account', fieldType: 'text', required: false, options: [], regex: '' },
        { name: '!!!', fieldType: 'text', required: false, options: [], regex: '' },
      ],
    });
    expect(saved.map((field) => [field.key, field.name, field.label])).toEqual([
      ['account', 'Account name', 'Z3X account'],
      ['account_2', 'account', 'account'],
      ['field', '!!!', '!!!'],
    ]);
  });

  it('refuses a field without a name, an unknown key, a repeated name and a second main input, naming each by position', async () => {
    const row = { fieldType: 'text' as const, required: false, options: [], regex: '' };
    const error = await replaceServiceFields(Z3X, {
      fields: [
        { ...row, name: '', isMainInput: true },
        { ...row, key: 'gone', name: 'B', isMainInput: true },
        { ...row, name: 'Email' },
        { ...row, name: ' email ' },
      ],
    }).catch((e: unknown) => e);
    const fieldErrors = (error as ApiError).fieldErrors;
    expect(fieldErrors['fields.0.name']).toEqual(['Enter a name.']);
    expect(fieldErrors['fields.1.key']).toEqual(['This field no longer exists. Reload the page.']);
    expect(fieldErrors['fields.1.isMainInput']).toEqual(['Only one field can be the main input.']);
    expect(fieldErrors['fields.3.name']).toEqual(['The name email is used by an earlier field.']);
    expect((await getService(Z3X)).fields).toHaveLength(1);
  });

  it('refuses a name over 120 characters and keeps a key within 60, with the number cut in when a base repeats', async () => {
    const row = { fieldType: 'text' as const, required: false, options: [], regex: '' };
    const error = await replaceServiceFields(Z3X, { fields: [{ ...row, name: 'n'.repeat(121) }] }).catch(
      (e: unknown) => e,
    );
    expect((error as ApiError).fieldErrors['fields.0.name']).toEqual(['Use at most 120 characters.']);
    const saved = await replaceServiceFields(Z3X, {
      fields: [
        { ...row, name: 'a'.repeat(120) },
        { ...row, name: 'a'.repeat(65) },
      ],
    });
    expect(saved.map((field) => field.key)).toEqual(['a'.repeat(60), `${'a'.repeat(58)}_2`]);
  });

  it('takes a field of the imei type, on a service of any type', async () => {
    const row = { name: 'Device IMEI', fieldType: 'imei' as const, required: true, options: [], regex: '' };
    for (const id of [ATT, Z3X]) {
      const [saved] = await replaceServiceFields(id, { fields: [row] });
      expect(saved).toMatchObject({ key: 'device_imei', fieldType: 'imei', required: true });
      expect((await getService(id)).fields).toMatchObject([{ fieldType: 'imei' }]);
    }
    const error = await replaceServiceFields(ATT, {
      fields: [{ ...row, fieldType: 'mac' as unknown as 'imei' }],
    }).catch((e: unknown) => e);
    expect((error as ApiError).fieldErrors['fields.0.fieldType']).toEqual(['Choose a type.']);
  });

  it('makes a field named IMEI the main input of an IMEI service when no row is flagged', async () => {
    const row = { fieldType: 'text' as const, required: true, options: [], regex: '' };
    const saved = await replaceServiceFields(ATT, {
      fields: [
        { ...row, name: 'Model' },
        { ...row, name: ' imei ' },
      ],
    });
    expect(saved.map((field) => field.isMainInput)).toEqual([false, true]);
    expect((await getService(ATT)).fields.map((field) => field.isMainInput)).toEqual([false, true]);
  });

  it('leaves the flag alone when a row is flagged already, and on a service that is not an IMEI service', async () => {
    const row = { fieldType: 'text' as const, required: true, options: [], regex: '' };
    const flagged = await replaceServiceFields(ATT, {
      fields: [
        { ...row, name: 'Serial', isMainInput: true },
        { ...row, name: 'IMEI' },
      ],
    });
    expect(flagged.map((field) => field.isMainInput)).toEqual([true, false]);
    const server = await replaceServiceFields(Z3X, { fields: [{ ...row, name: 'IMEI' }] });
    expect(server.map((field) => field.isMainInput)).toEqual([false]);
  });

  it('keeps the saved label and main input of a field when the row leaves them out', async () => {
    await replaceServiceFields(Z3X, {
      fields: [
        {
          key: 'account',
          name: 'user',
          label: 'Z3X account',
          fieldType: 'text',
          required: true,
          options: [],
          regex: '',
          isMainInput: true,
        },
      ],
    });
    const [kept] = await replaceServiceFields(Z3X, {
      fields: [{ key: 'account', name: 'user', fieldType: 'text', required: true, options: [], regex: '' }],
    });
    expect(kept).toMatchObject({ key: 'account', label: 'Z3X account', isMainInput: true });
  });

  it('replaces the group prices, for any group id (the accounts feature owns the groups)', async () => {
    const requests = recordRequests();
    const prices = [{ groupId: 2, price: '16.0000' }];
    expect(await replaceServiceGroupPrices(ATT, { prices, retailPriceSeen: null })).toEqual(prices);
    expect(requests.last()).toMatchObject({ method: 'PUT', body: { prices, retailPriceSeen: null } });
    expect(requests.last().url.pathname).toBe('/admin/services/5/group-prices');
    const unknown = [{ groupId: 99, price: '1.0000' }];
    expect(await replaceServiceGroupPrices(ATT, { prices: unknown, retailPriceSeen: null })).toEqual(unknown);
    expect((await getService(ATT)).groupPrices).toEqual(unknown);
  });

  it('refuses a group price that names no group or has no price', async () => {
    const noGroup = await replaceServiceGroupPrices(ATT, {
      prices: [{ groupId: 0, price: '1.0000' }],
      retailPriceSeen: null,
    }).catch((e: unknown) => e);
    expect((noGroup as ApiError).fieldErrors['prices.0.groupId']).toEqual(['Choose a rank.']);
    const noPrice = await replaceServiceGroupPrices(ATT, {
      prices: [{ groupId: 2, price: '0.0000' }],
      retailPriceSeen: null,
    }).catch((e: unknown) => e);
    expect((noPrice as ApiError).fieldErrors['prices.0.price']).toEqual(['Enter a price greater than zero.']);
  });
});

describe('replaceServiceGroupPrices: retailPriceSeen', () => {
  const RETAIL = 9;

  /** A retail group in the mock menu and a stored retail price of 19.99 on service 5, which already has VIP 15.90. */
  async function withRetail() {
    const stores = await servicesStore();
    stores.groups.push({ id: RETAIL, name: 'Storefront retail', kind: 'b2c_retail', discountPercent: 0 });
    const service = stores.services.find(String(ATT));
    service?.groupPrices.push({ groupId: RETAIL, price: '19.9900' });
  }

  it('is refused on its own field unless it is null or money with four decimals', async () => {
    for (const retailPriceSeen of ['19.99', 'abc', 19.99, '']) {
      const refused = await replaceServiceGroupPrices(ATT, {
        prices: [{ groupId: 2, price: '16.0000' }],
        retailPriceSeen: retailPriceSeen as never,
      }).catch((e: unknown) => e);
      expect((refused as ApiError).fieldErrors['retailPriceSeen']).toHaveLength(1);
    }
    expect((await getService(ATT)).groupPrices).toEqual([{ groupId: 3, price: '15.9000' }]);
  });

  it('keeps the stored retail price when the retail row sent is the figure seen, even if the row sent is stale', async () => {
    await withRetail();
    const saved = await replaceServiceGroupPrices(ATT, {
      prices: [
        { groupId: 2, price: '16.0000' },
        { groupId: RETAIL, price: '19.9900' },
      ],
      retailPriceSeen: '19.9900',
    });
    expect(saved).toContainEqual({ groupId: RETAIL, price: '19.9900' });
    const service = (await servicesStore()).services.find(String(ATT));
    if (service) service.groupPrices = [{ groupId: RETAIL, price: '20.4900' }];
    const kept = await replaceServiceGroupPrices(ATT, {
      prices: [{ groupId: RETAIL, price: '19.9900' }],
      retailPriceSeen: '19.9900',
    });
    expect(kept).toEqual([{ groupId: RETAIL, price: '20.4900' }]);
  });

  it('writes the retail row when it differs from the figure seen, and every row as sent without the key', async () => {
    await withRetail();
    const typed = await replaceServiceGroupPrices(ATT, {
      prices: [{ groupId: RETAIL, price: '21.0000' }],
      retailPriceSeen: '19.9900',
    });
    expect(typed).toEqual([{ groupId: RETAIL, price: '21.0000' }]);
    const asSent = await replaceServiceGroupPrices(ATT, {
      prices: [{ groupId: RETAIL, price: '22.0000' }],
    } as never);
    expect(asSent).toEqual([{ groupId: RETAIL, price: '22.0000' }]);
  });

  it('with seen null, drops no retail price that was set since: no retail row sent means untouched', async () => {
    await withRetail();
    const kept = await replaceServiceGroupPrices(ATT, {
      prices: [{ groupId: 2, price: '16.0000' }],
      retailPriceSeen: null,
    });
    expect(kept).toEqual([
      { groupId: 2, price: '16.0000' },
      { groupId: RETAIL, price: '19.9900' },
    ]);
  });
});

describe('categories', () => {
  it('lists the categories with the groups that see them and how many services they hold', async () => {
    const page = await listCategories({ start: 0, end: 20, sort: ['sort'], order: ['asc'] });
    expect(page.total).toBe(9);
    expect(page.data[0]).toMatchObject({
      id: APPLE,
      name: 'Apple',
      type: 'imei',
      allowedGroupIds: [],
      serviceCount: 4,
    });
  });

  it('creates, changes and reads a category', async () => {
    const requests = recordRequests();
    const created = await createCategory({
      name: 'Games',
      type: 'server',
      allowedGroupIds: [2],
      sort: 20,
      isActive: true,
    });
    expect(requests.last()).toMatchObject({ method: 'POST' });
    expect(requests.last().url.pathname).toBe('/admin/service-categories');
    expect(created).toMatchObject({ name: 'Games', allowedGroupIds: [2] });
    const renamed = await updateCategory(created.id, { name: 'Gaming', isActive: false });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { name: 'Gaming', isActive: false } });
    expect(renamed).toMatchObject({ name: 'Gaming', isActive: false, allowedGroupIds: [2] });
    expect(await getCategory(created.id)).toMatchObject({ name: 'Gaming' });
  });

  it('takes any group id, and refuses a blank name or an id that is not a group', async () => {
    const made = await createCategory({
      name: 'X',
      type: 'imei',
      allowedGroupIds: [99],
      sort: 0,
      isActive: true,
    });
    expect(made.allowedGroupIds).toEqual([99]);
    const notGroup = await createCategory({
      name: 'Y',
      type: 'imei',
      allowedGroupIds: [0],
      sort: 0,
      isActive: true,
    }).catch((e: unknown) => e);
    expect((notGroup as ApiError).fieldErrors.allowedGroupIds).toEqual(['Choose ranks.']);
    const blank = await createCategory({
      name: ' ',
      type: 'imei',
      allowedGroupIds: [],
      sort: 0,
      isActive: true,
    }).catch((e: unknown) => e);
    expect((blank as ApiError).fieldErrors.name).toEqual(['Enter a name.']);
  });

  it('refuses to delete a category that services use, and deletes an empty one', async () => {
    await expect(deleteCategory(APPLE)).rejects.toMatchObject({ status: 409, code: 'CATEGORY_IN_USE' });
    const empty = await createCategory({
      name: 'Empty',
      type: 'imei',
      allowedGroupIds: [],
      sort: 1,
      isActive: true,
    });
    await expect(deleteCategory(empty.id)).resolves.toBeUndefined();
    await expect(getCategory(empty.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('the data-provider registry', () => {
  it('registers the four resources with the operations their endpoints offer', () => {
    const operations = (name: string) => Object.keys(servicesResources[name]).sort();
    expect(Object.keys(servicesResources).sort()).toEqual([
      'inventory-codes',
      'pricing-rules',
      'service-categories',
      'services',
    ]);
    expect(operations('services')).toEqual(['create', 'delete', 'list', 'show', 'update']);
    expect(operations('service-categories')).toEqual(['create', 'delete', 'list', 'show', 'update']);
    expect(operations('pricing-rules')).toEqual(['create', 'delete', 'list', 'show', 'update']);
    expect(operations('inventory-codes')).toEqual(['list']);
  });
});
