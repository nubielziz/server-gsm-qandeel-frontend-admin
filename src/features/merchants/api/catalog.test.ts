// Tests for the group, client price, verification and service lookup functions, run against the dev mock API (`mockServer`): each
// reaches its route with the query or body of its assumed contract, and the mock's refusals (duplicate name, group in use, price below
// the floor, request already decided) come back as the ApiError the dialogs show.
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { listServiceOptions } from './lookups';
import {
  createClientGroup,
  createClientPrice,
  decideKycSubmission,
  deleteClientGroup,
  deleteClientPrice,
  getClient,
  getClientGroup,
  getKycSubmission,
  kycFileUrl,
  listClientGroups,
  listClientPrices,
  listKycSubmissions,
  updateClientGroup,
  updateClientPrice,
} from '.';

setupMockApi();
installMerchantMocks();
beforeEach(async () => {
  await signInAs();
});

// Merchants and services of the mock seed (taken from the demo; see mocks/seed.ts).
const ZAIN = 1; // VIP, one fixed price: iCloud Clean / Lost Check at $0.10
const CAIRO = 5; // VIP, one fixed price: AT&T USA Premier Unlock at $15.20 against a VIP price of $15.90
const ICLOUD = 1; // base $0.13, cost $0.08 plus $0.02 minimum profit, so a floor of $0.10
const TMOBILE = 6; // base $12.74, floor $10.39

describe('groups', () => {
  it('lists the groups with how many merchants are in each and marks the storefront’s retail group', async () => {
    const { data, total } = await listClientGroups({ sort: ['sort'], order: ['asc'] });
    expect(total).toBe(4);
    expect(data.map((g) => [g.name, g.merchantCount, g.kind])).toEqual([
      ['Standard', 11, 'b2b'],
      ['Wholesale', 6, 'b2b'],
      ['VIP', 3, 'b2b'],
      ['Storefront retail', 0, 'b2c_retail'],
    ]);
    expect(data[1]).toMatchObject({
      discountPercent: '4.0000',
      earnThreshold: '5000.0000',
      depositLimit: '20000.0000',
      overdraftAllowed: true,
    });
    expect((await getClientGroup(3)).name).toBe('VIP');
  });

  it('creates a group, and a new default takes the mark off the old one', async () => {
    const created = await createClientGroup({
      name: 'Reseller',
      discountPercent: '6',
      earnThreshold: '10000.0000',
      depositLimit: '50000.0000',
      overdraftAllowed: true,
      isDefault: true,
    });
    expect(created).toMatchObject({
      name: 'Reseller',
      discountPercent: '6',
      isDefault: true,
      merchantCount: 0,
    });
    const groups = (await listClientGroups()).data;
    expect(groups.filter((g) => g.isDefault).map((g) => g.name)).toEqual(['Reseller']);
  });

  it('refuses a duplicate name under the name field', async () => {
    await expect(
      createClientGroup({
        name: 'vip',
        discountPercent: '0',
        earnThreshold: '0.0000',
        depositLimit: '0.0000',
        overdraftAllowed: false,
        isDefault: false,
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: ['A group with this name already exists.'] },
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
    await updateClientGroup(2, { discountPercent: '5' });
    expect(body).toEqual({ discountPercent: '5' });
  });

  it('changes a group on the mock server', async () => {
    const updated = await updateClientGroup(2, { name: 'Wholesale+', discountPercent: '5' });
    expect(updated).toMatchObject({ name: 'Wholesale+', discountPercent: '5', merchantCount: 6 });
    // The merchant rows carry the group's new name and discount.
    expect((await getClient(2)).group).toMatchObject({ name: 'Wholesale+', discountPercent: '5' });
    await expect(updateClientGroup(99, { name: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('deletes an empty group, and refuses one that still has merchants with the number to move', async () => {
    await expect(deleteClientGroup(3)).rejects.toMatchObject({
      status: 409,
      code: 'GROUP_IN_USE',
      detail: 'Move the 3 merchants in VIP to another group first.',
    });
    await deleteClientGroup(4);
    expect((await listClientGroups()).total).toBe(3);
    await expect(deleteClientGroup(4)).rejects.toMatchObject({ status: 404 });
  });
});

describe('client prices', () => {
  it('lists one merchant’s fixed prices with the service and the price they would pay without them', async () => {
    const zain = await listClientPrices({ filters: { clientId: ZAIN } });
    expect(zain.total).toBe(1);
    expect(zain.data[0]).toMatchObject({
      clientId: ZAIN,
      price: '0.1000',
      service: { name: 'iCloud Clean / Lost Check', type: 'imei', basePrice: '0.1300', floorPrice: '0.1000' },
      // VIP has no fixed price for the service, so the group price is the base with VIP's 8% off.
      groupPrice: '0.1196',
    });
    const cairo = await listClientPrices({ filters: { clientId: CAIRO } });
    expect(cairo.data[0]).toMatchObject({
      price: '15.2000',
      groupPrice: '15.9000',
      service: { floorPrice: '14.3100' },
    });
    expect((await listClientPrices()).total).toBe(3);
  });

  it('sets a price, keeps the note, and shows it in the merchant’s list', async () => {
    const created = await createClientPrice({
      clientId: ZAIN,
      serviceId: TMOBILE,
      price: '11.5000',
      note: 'Volume deal',
    });
    expect(created).toMatchObject({ clientId: ZAIN, price: '11.5000', note: 'Volume deal' });
    expect((await listClientPrices({ filters: { clientId: ZAIN } })).total).toBe(2);
  });

  it('sends the body of its contract', async () => {
    let body: unknown;
    mockServer.use(
      http.post('*/admin/client-prices', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 9 }, { status: 201 });
      }),
    );
    await createClientPrice({ clientId: ZAIN, serviceId: TMOBILE, price: '11.5000' });
    expect(body).toEqual({ clientId: ZAIN, serviceId: TMOBILE, price: '11.5000' });
  });

  it('refuses a price below the floor under the price field, with the demo’s words', async () => {
    const error = await createClientPrice({ clientId: ZAIN, serviceId: TMOBILE, price: '5.0000' }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({
      status: 422,
      fieldErrors: { price: ['Below the floor of $10.39 (cost $9.80 plus $0.59 minimum profit).'] },
    });
    await expect(updateClientPrice(1, { price: '0.0500' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { price: [expect.stringContaining('Below the floor of $0.10')] },
    });
  });

  it('refuses a second price for the same service', async () => {
    await expect(
      createClientPrice({ clientId: ZAIN, serviceId: ICLOUD, price: '0.2000' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PRICE_EXISTS',
    });
  });

  it('changes the price and the note, and removes a price', async () => {
    const [row] = (await listClientPrices({ filters: { clientId: ZAIN } })).data;
    expect(await updateClientPrice(row.id, { price: '0.1200', note: 'Renewed' })).toMatchObject({
      price: '0.1200',
      note: 'Renewed',
    });
    await deleteClientPrice(row.id);
    expect((await listClientPrices({ filters: { clientId: ZAIN } })).total).toBe(0);
    await expect(deleteClientPrice(row.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('verification requests', () => {
  it('counts the requests by status with a one-row call', async () => {
    const total = async (status?: 'pending' | 'approved' | 'rejected') =>
      (await listKycSubmissions({ start: 0, end: 1, filters: status ? { status } : undefined })).total;
    expect([await total(), await total('pending'), await total('approved'), await total('rejected')]).toEqual(
      [6, 2, 3, 1],
    );
  });

  it('lists a status newest first with the merchant joined', async () => {
    const { data } = await listKycSubmissions({
      filters: { status: 'pending' },
      sort: ['createdAt'],
      order: ['desc'],
    });
    expect(data.map((s) => s.client.name).sort()).toEqual(['Accra Devices', 'Algiers Service Plus']);
    expect(data[0]).toMatchObject({
      status: 'pending',
      client: { email: expect.stringContaining('@'), country: expect.any(String), status: 'pending' },
      fileIds: expect.any(Array),
      reviewedBy: null,
    });
  });

  it('reads one request with its documents named', async () => {
    const request = await getKycSubmission(1);
    expect(request.files).toEqual([
      { id: 9002, filename: 'passport.jpg', mime: 'image/jpeg', size: 482_000 },
      { id: 9003, filename: 'trade-licence.pdf', mime: 'application/pdf', size: 1_240_000 },
    ]);
    await expect(getKycSubmission(999)).rejects.toMatchObject({ status: 404 });
  });

  it('approves a request, records who did it and sets the merchant’s verification', async () => {
    const [pending] = (await listKycSubmissions({ filters: { status: 'pending' } })).data;
    const decided = await decideKycSubmission(pending.id, { decision: 'approve' });
    expect(decided).toMatchObject({ status: 'approved', reviewedBy: { name: 'Rami K.' } });
    expect(decided.reviewedAt).toEqual(expect.any(String));
    expect((await getClient(pending.clientId)).kycStatus).toBe('approved');
    await expect(
      decideKycSubmission(pending.id, { decision: 'reject', note: 'Too late' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_DECIDED',
    });
  });

  it('wants a reason to reject, saves it with the decision and sends the body of its contract', async () => {
    const [pending] = (await listKycSubmissions({ filters: { status: 'pending' } })).data;
    await expect(decideKycSubmission(pending.id, { decision: 'reject' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { note: ['Add a reason for the rejection.'] },
    });
    const rejected = await decideKycSubmission(pending.id, { decision: 'reject', note: 'Unreadable photo' });
    expect(rejected).toMatchObject({ status: 'rejected', note: 'Unreadable photo' });
    expect((await getClient(pending.clientId)).kycStatus).toBe('rejected');
  });

  it('builds the link of a document from the API address, with the id in the path', () => {
    expect(kycFileUrl(9002)).toBe('http://api.test/admin/files/9002');
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
