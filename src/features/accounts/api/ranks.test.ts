// Tests for the rank, fixed price and service lookup functions, run against the dev mock API (`mockServer`): each reaches its route with the
// query or body of its assumed contract, and the mock's refusals (duplicate name, rank in use, price below the floor, a retail account)
// come back as the ApiError the dialogs show. Ports the group and client price cases, with a rank for every account.
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { SEED } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import { listServiceOptions } from './lookups';
import {
  createAccountPrice,
  createRank,
  deleteAccountPrice,
  deleteRank,
  getAccount,
  getRank,
  listAccountPrices,
  listRanks,
  updateAccountPrice,
  updateRank,
} from '.';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

const { ZAIN, CAIRO, DANIEL } = SEED;
const ICLOUD = 1; // base $0.13, cost $0.08 plus $0.02 minimum profit, so a floor of $0.10
const TMOBILE = 6; // base $12.74, floor $10.39

describe('ranks', () => {
  it('lists the ranks with how many accounts are in each, the retail rank too', async () => {
    const { data, total } = await listRanks({ sort: ['sort'], order: ['asc'] });
    expect(total).toBe(4);
    expect(data.map((g) => [g.name, g.accountCount, g.kind, g.rankKind])).toEqual([
      ['Standard', 11, 'b2b', 'merchant'],
      ['Wholesale', 6, 'b2b', 'merchant'],
      ['VIP', 3, 'b2b', 'merchant'],
      ['Storefront retail', 31, 'b2c_retail', 'retail'],
    ]);
    expect(data[1]).toMatchObject({
      discountPercent: '4.0000',
      depositLimit: '20000.0000',
      overdraftAllowed: true,
    });
    expect((await getRank(3)).name).toBe('VIP');
  });

  it('creates a rank, and a new default takes the mark off the old one', async () => {
    const created = await createRank({
      name: 'Reseller',
      discountPercent: '6',
      depositLimit: '50000.0000',
      overdraftAllowed: true,
      isDefault: true,
    });
    expect(created).toMatchObject({
      name: 'Reseller',
      discountPercent: '6',
      isDefault: true,
      accountCount: 0,
      rankKind: 'merchant',
    });
    const ranks = (await listRanks()).data;
    expect(ranks.filter((g) => g.isDefault).map((g) => g.name)).toEqual(['Reseller']);
  });

  it('refuses a duplicate name under the name field', async () => {
    await expect(
      createRank({
        name: 'vip',
        discountPercent: '0',
        depositLimit: '0.0000',
        overdraftAllowed: false,
        isDefault: false,
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: ['A rank with this name already exists.'] },
    });
  });

  it('sends only the fields that change and the mock keeps them', async () => {
    let body: unknown;
    mockServer.use(
      http.patch('*/admin/client-groups/2', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 2 });
      }),
    );
    await updateRank(2, { discountPercent: '5' });
    expect(body).toEqual({ discountPercent: '5' });
  });

  it('changes a rank on the mock server, and the account rows carry its new name and discount', async () => {
    const updated = await updateRank(2, { name: 'Wholesale+', discountPercent: '5' });
    expect(updated).toMatchObject({ name: 'Wholesale+', discountPercent: '5', accountCount: 6 });
    expect((await getAccount(2)).rank).toMatchObject({ name: 'Wholesale+', discountPercent: '5' });
    await expect(updateRank(99, { name: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('never lets the retail rank allow credit', async () => {
    await expect(updateRank(4, { overdraftAllowed: true })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { overdraftAllowed: ['The retail rank never allows credit.'] },
    });
  });

  it('deletes an empty rank, and refuses the retail rank and one that still has accounts with the number to move', async () => {
    await expect(deleteRank(3)).rejects.toMatchObject({
      status: 409,
      code: 'GROUP_IN_USE',
      detail: 'Move the 3 accounts in VIP to another rank first.',
    });
    await expect(deleteRank(4)).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    const created = await createRank({
      name: 'Empty',
      discountPercent: '0',
      depositLimit: '0.0000',
      overdraftAllowed: false,
      isDefault: false,
    });
    await deleteRank(created.id);
    expect((await listRanks()).total).toBe(4);
    await expect(deleteRank(created.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('fixed prices', () => {
  it('lists one account’s fixed prices with the service and the price they would pay without them', async () => {
    const zain = await listAccountPrices({ filters: { clientId: ZAIN } });
    expect(zain.total).toBe(1);
    expect(zain.data[0]).toMatchObject({
      clientId: ZAIN,
      price: '0.1000',
      service: { name: 'iCloud Clean / Lost Check', type: 'imei', basePrice: '0.1300', floorPrice: '0.1000' },
      // VIP has no fixed price for the service, so the rank price is the base with VIP's 8% off.
      groupPrice: '0.1196',
    });
    const cairo = await listAccountPrices({ filters: { clientId: CAIRO } });
    expect(cairo.data[0]).toMatchObject({
      price: '15.2000',
      groupPrice: '15.9000',
      service: { floorPrice: '14.3100' },
    });
    expect((await listAccountPrices()).total).toBe(3);
  });

  it('sets a price, keeps the note, and shows it in the account’s list', async () => {
    const created = await createAccountPrice({
      clientId: ZAIN,
      serviceId: TMOBILE,
      price: '11.5000',
      note: 'Volume deal',
    });
    expect(created).toMatchObject({ clientId: ZAIN, price: '11.5000', note: 'Volume deal' });
    expect((await listAccountPrices({ filters: { clientId: ZAIN } })).total).toBe(2);
  });

  it('sends the body of its contract', async () => {
    let body: unknown;
    mockServer.use(
      http.post('*/admin/client-prices', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 9 }, { status: 201 });
      }),
    );
    await createAccountPrice({ clientId: ZAIN, serviceId: TMOBILE, price: '11.5000' });
    expect(body).toEqual({ clientId: ZAIN, serviceId: TMOBILE, price: '11.5000' });
  });

  it('refuses a price below the floor under the price field, with the demo’s words', async () => {
    const error = await createAccountPrice({ clientId: ZAIN, serviceId: TMOBILE, price: '5.0000' }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({
      status: 422,
      fieldErrors: { price: ['Below the floor of $10.39 (cost $9.80 plus $0.59 minimum profit).'] },
    });
    await expect(updateAccountPrice(1, { price: '0.0500' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { price: [expect.stringContaining('Below the floor of $0.10')] },
    });
  });

  it('refuses a second price for the same service, and a price for a retail account', async () => {
    await expect(
      createAccountPrice({ clientId: ZAIN, serviceId: ICLOUD, price: '0.2000' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PRICE_EXISTS',
    });
    await expect(
      createAccountPrice({ clientId: DANIEL, serviceId: ICLOUD, price: '0.2000' }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { clientId: ['A retail account has no fixed prices.'] },
    });
    await expect(
      createAccountPrice({ clientId: 9999, serviceId: ICLOUD, price: '0.2000' }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('changes the price and the note, and removes a price', async () => {
    const [row] = (await listAccountPrices({ filters: { clientId: ZAIN } })).data;
    expect(await updateAccountPrice(row.id, { price: '0.1200', note: 'Renewed' })).toMatchObject({
      price: '0.1200',
      note: 'Renewed',
    });
    await deleteAccountPrice(row.id);
    expect((await listAccountPrices({ filters: { clientId: ZAIN } })).total).toBe(0);
    await expect(deleteAccountPrice(row.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('service lookup', () => {
  it('asks for the active services by name, up to a cap', async () => {
    let params = new URLSearchParams();
    mockServer.use(
      http.get('*/admin/services', ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json([{ id: 1, name: 'A' }], { headers: { 'x-total-count': '1' } });
      }),
    );
    const { data } = await listServiceOptions();
    expect(data).toHaveLength(1);
    expect(Object.fromEntries(params)).toEqual({
      _start: '0',
      _end: '200',
      _sort: 'name',
      _order: 'asc',
      status: 'active',
    });
  });
});
