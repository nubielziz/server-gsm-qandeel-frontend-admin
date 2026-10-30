// Tests for the suppliers API functions, run against the feature's own mocks (installed first, because the shared lookup mock
// also answers `GET /admin/suppliers`): each function reaches its route with the body of its assumed contract and reads the
// answer the way the screens do. The mock keeps simple state, so an action is checked by reading the supplier again.
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { isApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { mocks } from '../mocks';
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  getSupplierApiLog,
  getSupplierReport,
  importServices,
  listSupplierApiLogs,
  listSupplierServices,
  listSuppliers,
  previewImport,
  replaceSupplierLinks,
  syncSupplier,
  testSupplier,
  updateSupplier,
} from '.';

setupMockApi();
beforeEach(async () => {
  mockServer.use(...mocks.handlers);
  await signInAs();
});

// Suppliers of the demo seed: ids 1 to 6.
const NORDIC = 1; // healthy, 6 primary and 8 fallback services
const GULF = 2; // healthy, low prepaid balance
const RAPID = 3; // degraded: its tests fail
const NEW_BODY = {
  name: 'Atlas IMEI',
  driver: 'dhru',
  baseUrl: 'https://api.atlasimei.example',
  username: 'gsm-supply',
  apiKey: 'sk_atlas_secret',
  currency: 'USD',
};

describe('suppliers', () => {
  it('lists the six suppliers with their health, balance and open orders, and the total from the header', async () => {
    const { data, total } = await listSuppliers();
    expect(total).toBe(6);
    expect(data.map((supplier) => supplier.name)).toEqual([
      'Nordic GSM',
      'Gulf Server Hub',
      'Rapid IMEI',
      'RemoteDesk Pro',
      'FileForge',
      'Bosphorus Unlock',
    ]);
    expect(data[RAPID - 1]).toMatchObject({
      health: 'degraded',
      status: 'active',
      driver: 'rest',
      balance: '640.0000',
      lowBalance: false,
    });
    expect(data[GULF - 1]).toMatchObject({ balance: '38.4000', lowBalance: true });
    expect(data[NORDIC - 1].openOrders).toBeGreaterThan(0);
    expect(data[NORDIC - 1].apiKeyHint).toBe('sk_57');
  });

  it('searches by name and pages', async () => {
    expect((await listSuppliers({ q: 'rapid' })).data.map((supplier) => supplier.id)).toEqual([RAPID]);
    const page = await listSuppliers({ start: 0, end: 2 });
    expect(page.data).toHaveLength(2);
    expect(page.total).toBe(6);
  });

  it('reads one supplier with its 24 hours of history and the services linked to it, each with its chain', async () => {
    const detail = await getSupplier(RAPID);
    expect(detail.history).toHaveLength(24);
    expect(detail.history[23]).toMatchObject({ successRate: 35.3, medianMs: 3292 });
    expect(detail.links).toHaveLength(4);
    const link = detail.links.find((candidate) => candidate.serviceName === 'iCloud Clean / Lost Check');
    expect(link).toMatchObject({ priority: 1, cost: '0.0800', slaMinutes: 2 });
    expect(link?.chain.map((step) => [step.priority, step.supplierName])).toEqual([
      [1, 'Rapid IMEI'],
      [2, 'Nordic GSM'],
    ]);
    await expect(getSupplier(999)).rejects.toMatchObject({ status: 404 });
  });

  it('connects a supplier: only a hint of the key comes back, and bad input is named per field', async () => {
    const created = await createSupplier(NEW_BODY);
    expect(created).toMatchObject({
      name: 'Atlas IMEI',
      status: 'active',
      apiKeyHint: 'sk_at',
      openOrders: 0,
    });
    expect(JSON.stringify(created)).not.toContain('sk_atlas_secret');
    expect((await listSuppliers()).total).toBe(7);

    const error = await createSupplier({ ...NEW_BODY, name: 'A', baseUrl: 'nope', apiKey: '' }).catch(
      (e) => e,
    );
    expect(isApiError(error)).toBe(true);
    expect(error.fieldErrors).toMatchObject({
      name: ['Enter a supplier name.'],
      baseUrl: ['Enter a valid URL, like https://api.example.com.'],
      apiKey: ['Enter the API key.'],
    });
    await expect(createSupplier({ ...NEW_BODY, name: 'nordic gsm' })).rejects.toMatchObject({
      fieldErrors: { name: ['A supplier with this name already exists.'] },
    });
  });

  it('changes only what it is given: the switch, the connection and a new key', async () => {
    const off = await updateSupplier(NORDIC, { status: 'disabled' });
    expect(off.status).toBe('disabled');
    expect(off.name).toBe('Nordic GSM');
    const edited = await updateSupplier(NORDIC, {
      baseUrl: 'https://api.nordic.example',
      apiKey: 'zz_newkey',
    });
    expect(edited).toMatchObject({
      status: 'disabled',
      baseUrl: 'https://api.nordic.example',
      apiKeyHint: 'zz_ne',
    });
    await expect(updateSupplier(NORDIC, { baseUrl: 'ftp://x' })).rejects.toMatchObject({ status: 422 });
  });

  it('refuses to delete a supplier that is in use and deletes one that is not', async () => {
    const error = await deleteSupplier(NORDIC).catch((e) => e);
    expect(error).toMatchObject({ status: 409, code: 'SUPPLIER_IN_USE' });
    expect(error.detail).toMatch(/open orders and 14 linked services/);

    const created = await createSupplier(NEW_BODY);
    await deleteSupplier(created.id);
    expect((await listSuppliers()).total).toBe(6);
    await expect(deleteSupplier(created.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('test connection and sync', () => {
  it('tests a healthy supplier and logs the call', async () => {
    const before = (await listSupplierApiLogs({ filters: { supplierId: NORDIC } })).total;
    expect(await testSupplier(NORDIC)).toMatchObject({
      ok: true,
      httpStatus: 200,
      accountName: 'GSM Supply',
    });
    expect((await listSupplierApiLogs({ filters: { supplierId: NORDIC } })).total).toBe(before + 1);
  });

  it('answers a failed test with the failure text instead of an error', async () => {
    const result = await testSupplier(RAPID);
    expect(result).toMatchObject({ ok: false, httpStatus: 504 });
    expect(result.message).toMatch(/accountinfo returned 504/);
  });

  it('syncs: the balance check time moves forward, and a down or disabled supplier is refused with the reason', async () => {
    const before = (await getSupplier(NORDIC)).balanceCheckedAt;
    const result = await syncSupplier(NORDIC);
    expect(result.services).toBeGreaterThan(14);
    expect(Date.parse(result.balanceCheckedAt)).toBeGreaterThan(Date.parse(before as string));
    expect((await getSupplier(NORDIC)).balanceCheckedAt).toBe(result.balanceCheckedAt);

    await updateSupplier(NORDIC, { status: 'disabled' });
    await expect(syncSupplier(NORDIC)).rejects.toMatchObject({ status: 409, code: 'SUPPLIER_DISABLED' });
  });
});

describe('supplier services and the import', () => {
  it('lists the supplier’s own services by page, name search and imported state, with the total', async () => {
    const all = await listSupplierServices(NORDIC);
    expect(all.total).toBe(17); // 14 linked services and 3 not imported
    const fresh = await listSupplierServices(NORDIC, { filters: { imported: false } });
    expect(fresh.data.map((item) => item.name)).toEqual([
      'Sprint USA Premium Unlock',
      'Telstra Australia Unlock',
      'Rogers Canada Unlock',
    ]);
    expect((await listSupplierServices(NORDIC, { q: 'telstra' })).data).toHaveLength(1);
    expect((await listSupplierServices(NORDIC, { start: 0, end: 5 })).data).toHaveLength(5);
  });

  it('previews what an import would do, then imports it and the services become linked', async () => {
    const list = await listSupplierServices(NORDIC);
    const fresh = list.data.find((item) => !item.imported);
    const changed = list.data.find((item) => item.imported && item.priceChangedAt);
    const same = list.data.find((item) => item.imported && !item.priceChangedAt);
    expect(same).toBeDefined();
    const ids = [fresh, changed, same].map((item) => item?.id as number);

    const { items } = await previewImport(NORDIC, { supplierServiceIds: ids });
    expect(items.map((item) => item.state)).toEqual(['new', 'changed', 'matching']);
    expect(items[0].suggestedPrice).not.toBeNull();
    expect(items[1].previousCost).not.toBe(items[1].cost);
    expect(items[2].suggestedPrice).toBeNull();

    expect(await importServices(NORDIC, { supplierServiceIds: ids })).toEqual({
      created: 1,
      updated: 1,
      unchanged: 1,
    });
    expect((await listSupplierServices(NORDIC, { filters: { imported: false } })).total).toBe(2);
    expect((await getSupplier(NORDIC)).links).toHaveLength(15);
    await expect(previewImport(NORDIC, { supplierServiceIds: [] })).rejects.toMatchObject({ status: 422 });
  });
});

describe('links', () => {
  it('replaces the chain of a service and sends the supplier services in priority order', async () => {
    const detail = await getSupplier(RAPID);
    const link = detail.links[0];
    const [primary, fallback] = link.chain;
    let sent: unknown;
    mockServer.use(
      http.put('*/admin/services/:id/supplier-links', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json([]);
      }),
    );
    await replaceSupplierLinks(link.serviceId, {
      links: [
        { supplierServiceId: fallback.supplierServiceId, priority: 1 },
        { supplierServiceId: primary.supplierServiceId, priority: 2 },
      ],
    });
    expect(sent).toEqual({
      links: [
        { supplierServiceId: fallback.supplierServiceId, priority: 1 },
        { supplierServiceId: primary.supplierServiceId, priority: 2 },
      ],
    });
  });

  it('swaps primary and fallback in the mock, and an empty chain unlinks the service', async () => {
    const link = (await getSupplier(RAPID)).links[0];
    const [primary, fallback] = link.chain;
    const chain = await replaceSupplierLinks(link.serviceId, {
      links: [
        { supplierServiceId: fallback.supplierServiceId, priority: 1 },
        { supplierServiceId: primary.supplierServiceId, priority: 2 },
      ],
    });
    expect(chain.map((step) => step.supplierName)).toEqual(['Nordic GSM', 'Rapid IMEI']);
    expect((await getSupplier(RAPID)).links.find((l) => l.serviceId === link.serviceId)?.priority).toBe(2);

    expect(await replaceSupplierLinks(link.serviceId, { links: [] })).toEqual([]);
    expect((await getSupplier(RAPID)).links.some((l) => l.serviceId === link.serviceId)).toBe(false);
    await expect(
      replaceSupplierLinks(link.serviceId, { links: [{ supplierServiceId: 99999, priority: 1 }] }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe('API log and report', () => {
  it('lists a supplier’s calls newest first without their bodies, and reads one call with both bodies', async () => {
    const page = await listSupplierApiLogs({
      start: 0,
      end: 10,
      sort: ['createdAt'],
      order: ['desc'],
      filters: { supplierId: NORDIC },
    });
    expect(page.data).toHaveLength(10);
    expect(page.data.every((log) => log.supplierId === NORDIC)).toBe(true);
    const times = page.data.map((log) => Date.parse(log.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(page.data[0]).not.toHaveProperty('request');

    const one = await getSupplierApiLog(page.data[0].id);
    expect(one.request).toMatchObject({ action: expect.any(String) });
    expect(one.request).toMatchObject({ apiaccesskey: '••••••••' });
    await expect(getSupplierApiLog(999999)).rejects.toMatchObject({ status: 404 });
  });

  it('reports spend, rejection rate and speed per supplier', async () => {
    const report = await getSupplierReport({ days: 30 });
    expect(report).toHaveLength(6);
    const nordic = report.find((row) => row.supplierId === NORDIC);
    expect(nordic?.orders).toBeGreaterThan(0);
    expect(Number(nordic?.spend)).toBeGreaterThan(0);
  });

  it('asks for the number of days it is given', async () => {
    let seen: string | null = null;
    mockServer.use(
      http.get('*/admin/reports/suppliers', ({ request }) => {
        seen = new URL(request.url).searchParams.get('days');
        return HttpResponse.json([]);
      }),
    );
    await getSupplierReport({ days: 7 });
    expect(seen).toBe('7');
  });
});
