// Tests for the catalog API functions (services, their parts, categories), run against the dev mock API: each one reaches its route with the
// body of its assumed contract and reads the answer the way the screens do. The mock plays the server, so a change can be checked by
// reading the record again.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  getCategory,
  getService,
  listCategories,
  listServices,
  replaceServiceFields,
  replaceServiceGroupPrices,
  replaceServiceOptions,
  servicesResources,
  updateCategory,
  updateService,
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
});

describe('getService', () => {
  it('reads one service with its fields, options and group prices', async () => {
    expect(await getService(ATT)).toMatchObject({
      id: ATT,
      name: 'AT&T USA Premier Unlock',
      groupPrices: [{ groupId: 3, price: '15.9000' }],
      options: [{ list: 'model' }, { list: 'model' }, { list: 'network' }],
      fields: [],
    });
    expect((await getService(Z3X)).fields).toMatchObject([
      { key: 'account', fieldType: 'text', required: true },
    ]);
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

  it('refuses a code that is taken, naming the field', async () => {
    const error = await createService({ ...body, code: 'IMEI-ATT-USA' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CODE_TAKEN' });
    expect((error as ApiError).fieldErrors.code[0]).toMatch(/already used by AT&T USA Premier Unlock/);
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
  it('replaces the custom fields, in order', async () => {
    const requests = recordRequests();
    const fields = [
      {
        key: 'a',
        label: 'A',
        fieldType: 'text' as const,
        required: true,
        options: [],
        regex: '^\\d+$',
        supplierKey: 'x',
      },
      {
        key: 'b',
        label: 'B',
        fieldType: 'select' as const,
        required: false,
        options: ['1', '2'],
        regex: '',
        supplierKey: '',
      },
    ];
    expect(await replaceServiceFields(Z3X, { fields })).toEqual(fields);
    expect(requests.last()).toMatchObject({ method: 'PUT', body: { fields } });
    expect(requests.last().url.pathname).toBe('/admin/services/15/fields');
    expect((await getService(Z3X)).fields).toEqual(fields);
  });

  it('refuses a field without a key, naming it by position', async () => {
    const field = {
      key: '',
      label: 'A',
      fieldType: 'text' as const,
      required: false,
      options: [],
      regex: '',
      supplierKey: '',
    };
    const error = await replaceServiceFields(Z3X, { fields: [field] }).catch((e: unknown) => e);
    expect((error as ApiError).fieldErrors['fields.0.key']).toEqual(['Enter a key.']);
  });

  it('replaces the option lists', async () => {
    const requests = recordRequests();
    const options = [{ list: 'mep' as const, value: 'm1', label: 'M1', supplierValue: '' }];
    expect(await replaceServiceOptions(ATT, { options })).toEqual(options);
    expect(requests.last()).toMatchObject({ method: 'PUT', body: { options } });
    expect(requests.last().url.pathname).toBe('/admin/services/5/options');
    expect((await getService(ATT)).options).toEqual(options);
  });

  it('replaces the group prices, for any group id (the merchants feature owns the groups)', async () => {
    const requests = recordRequests();
    const prices = [{ groupId: 2, price: '16.0000' }];
    expect(await replaceServiceGroupPrices(ATT, { prices })).toEqual(prices);
    expect(requests.last()).toMatchObject({ method: 'PUT', body: { prices } });
    expect(requests.last().url.pathname).toBe('/admin/services/5/group-prices');
    const unknown = [{ groupId: 99, price: '1.0000' }];
    expect(await replaceServiceGroupPrices(ATT, { prices: unknown })).toEqual(unknown);
    expect((await getService(ATT)).groupPrices).toEqual(unknown);
  });

  it('refuses a group price that names no group or has no price', async () => {
    const noGroup = await replaceServiceGroupPrices(ATT, { prices: [{ groupId: 0, price: '1.0000' }] }).catch(
      (e: unknown) => e,
    );
    expect((noGroup as ApiError).fieldErrors['prices.0.groupId']).toEqual(['Choose a merchant group.']);
    const noPrice = await replaceServiceGroupPrices(ATT, { prices: [{ groupId: 2, price: '0.0000' }] }).catch(
      (e: unknown) => e,
    );
    expect((noPrice as ApiError).fieldErrors['prices.0.price']).toEqual(['Enter a price greater than zero.']);
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
    expect((notGroup as ApiError).fieldErrors.allowedGroupIds).toEqual(['Choose merchant groups.']);
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
