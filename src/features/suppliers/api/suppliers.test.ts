// Tests for the suppliers API functions, run against the feature's own mocks (installed first, because the shared lookup mock
// also answers `GET /admin/suppliers`): each function reaches its route with the body of its assumed contract and reads the
// answer the way the screens do. The mock keeps simple state, so an action is checked by reading the supplier again.
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { isApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { mocks, suppliersState } from '../mocks';
import {
  createSupplier,
  deleteSupplier,
  getQuickAddRun,
  getSupplier,
  getSupplierApiLog,
  getSupplierReport,
  importServices,
  listServiceGroups,
  listSupplierApiLogs,
  listSupplierServices,
  listSuppliers,
  previewImport,
  replaceSupplierLinks,
  startQuickAdd,
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
    // The supplier's rule for a new item, and no difference for a service that states none.
    expect(items[0]).toMatchObject({ minQty: 1, maxQty: 50, qtyOptions: [], quantityDiffers: false });
    expect(items[2]).toMatchObject({ minQty: 1, maxQty: 1, qtyOptions: [], quantityDiffers: false });

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

describe('the supplier services list by group', () => {
  it('narrows to one group (type and name together) or to the services still listed by the supplier', async () => {
    const apple = await listSupplierServices(NORDIC, { filters: { remoteGroup: 'Apple', type: 'imei' } });
    expect(apple.total).toBe(4);
    expect(apple.data.every((item) => item.remoteGroup === 'Apple')).toBe(true);
    // The pair is exact: another type with the same group name is another group.
    expect(
      (await listSupplierServices(NORDIC, { filters: { remoteGroup: 'Apple', type: 'server' } })).total,
    ).toBe(0);
    const gone = await listSupplierServices(NORDIC, { filters: { isAvailable: false } });
    expect(gone.data.map((item) => item.name)).toEqual(['Rogers Canada Unlock']);
  });
});

describe('quick add', () => {
  const USA = { type: 'imei', remoteGroup: 'USA' };
  const AUSTRALIA = { type: 'imei', remoteGroup: 'Australia' };

  it('counts a supplier’s services by group, each one in a single bucket, with the totals and no run yet', async () => {
    const { groups, totals, latestRun } = await listServiceGroups(NORDIC);
    expect(groups.map((group) => group.remoteGroup)).toEqual([
      'Apple',
      'Australia',
      'Canada',
      'Carrier unlock',
      'Generic',
      'Samsung',
      'USA',
      'Xiaomi',
    ]);
    expect(groups.find((group) => group.remoteGroup === 'USA')).toEqual({
      ...USA,
      total: 1,
      addable: 1,
      imported: 0,
      unavailable: 0,
      unsupported: 0,
    });
    // The one service the supplier no longer lists is "unavailable", not "addable".
    expect(groups.find((group) => group.remoteGroup === 'Canada')).toMatchObject({
      total: 1,
      addable: 0,
      unavailable: 1,
    });
    expect(groups.find((group) => group.remoteGroup === 'Apple')).toMatchObject({
      total: 4,
      addable: 0,
      imported: 4,
    });
    expect(totals).toEqual({ total: 17, addable: 2, imported: 14, unavailable: 1, unsupported: 0 });
    expect(latestRun).toBeNull();
    await expect(listServiceGroups(99999)).rejects.toMatchObject({ status: 404 });
  });

  it('reaches its three routes with the method, the path and the body of the contract', async () => {
    const seen: { method: string; path: string; body?: unknown }[] = [];
    mockServer.use(
      http.get('*/admin/suppliers/:id/service-groups', ({ request }) => {
        seen.push({ method: request.method, path: new URL(request.url).pathname });
        return HttpResponse.json({ groups: [], totals: {}, latestRun: null });
      }),
      http.post('*/admin/suppliers/:id/quick-add', async ({ request }) => {
        seen.push({
          method: request.method,
          path: new URL(request.url).pathname,
          body: await request.json(),
        });
        return HttpResponse.json({ id: 7 }, { status: 202 });
      }),
      http.get('*/admin/suppliers/:id/quick-add/:runId', ({ request }) => {
        seen.push({ method: request.method, path: new URL(request.url).pathname });
        return HttpResponse.json({ id: 7 });
      }),
    );
    await listServiceGroups(NORDIC);
    await startQuickAdd(NORDIC, { scope: 'groups', groups: [USA], serviceStatus: 'disabled' });
    await startQuickAdd(NORDIC, { scope: 'all' });
    await getQuickAddRun(NORDIC, 7);
    expect(seen).toEqual([
      { method: 'GET', path: '/admin/suppliers/1/service-groups' },
      {
        method: 'POST',
        path: '/admin/suppliers/1/quick-add',
        body: { scope: 'groups', groups: [USA], serviceStatus: 'disabled' },
      },
      { method: 'POST', path: '/admin/suppliers/1/quick-add', body: { scope: 'all' } },
      { method: 'GET', path: '/admin/suppliers/1/quick-add/7' },
    ]);
  });

  it('adds the picked group at once, and the run reads queued, then half done, then finished', async () => {
    const run = await startQuickAdd(NORDIC, { scope: 'groups', groups: [USA] });
    expect(run).toMatchObject({
      supplierId: NORDIC,
      scope: 'groups',
      groups: [USA],
      serviceStatus: 'active',
      status: 'queued',
      total: 1,
      processed: 0,
      created: 0,
      error: null,
      finishedAt: null,
    });
    // The newest run is part of the groups listing, and reading that does not move the run on.
    expect((await listServiceGroups(NORDIC)).latestRun).toMatchObject({ id: run.id, status: 'queued' });
    expect(await getQuickAddRun(NORDIC, run.id)).toMatchObject({ status: 'running', total: 1 });
    expect(await getQuickAddRun(NORDIC, run.id)).toMatchObject({
      status: 'succeeded',
      processed: 1,
      created: 1,
      skipped: 0,
      failed: 0,
      categoriesCreated: 1,
    });

    const after = await listServiceGroups(NORDIC);
    expect(after.groups.find((group) => group.remoteGroup === 'USA')).toMatchObject({
      addable: 0,
      imported: 1,
    });
    expect(after.groups.find((group) => group.remoteGroup === 'Australia')).toMatchObject({ addable: 1 });
    expect(after.latestRun).toMatchObject({ id: run.id, status: 'succeeded' });
    expect((await getSupplier(NORDIC)).links).toHaveLength(15);
  });

  it('adds every service of the supplier with the scope all, switched off when asked', async () => {
    const run = await startQuickAdd(NORDIC, { scope: 'all', serviceStatus: 'disabled' });
    expect(run).toMatchObject({ scope: 'all', groups: [], serviceStatus: 'disabled', total: 2 });
    const state = await suppliersState();
    const added = state.services.list().filter((service) => service.code.startsWith('IMP-'));
    expect(added.map((service) => service.name)).toEqual([
      'Sprint USA Premium Unlock',
      'Telstra Australia Unlock',
    ]);
    expect(added.every((service) => service.status === 'disabled')).toBe(true);
    await getQuickAddRun(NORDIC, run.id);
    expect(await getQuickAddRun(NORDIC, run.id)).toMatchObject({ created: 2, categoriesCreated: 2 });
    // The unavailable service was left out, so the supplier has nothing left to add.
    expect((await listServiceGroups(NORDIC)).totals).toMatchObject({ addable: 0, unavailable: 1 });
  });

  it('refuses a second run while one is going, and a scope with nothing left to add', async () => {
    const run = await startQuickAdd(NORDIC, { scope: 'groups', groups: [USA] });
    await expect(startQuickAdd(NORDIC, { scope: 'groups', groups: [AUSTRALIA] })).rejects.toMatchObject({
      status: 409,
      code: 'JOB_ALREADY_RUNNING',
    });
    await getQuickAddRun(NORDIC, run.id);
    await getQuickAddRun(NORDIC, run.id);
    await expect(startQuickAdd(NORDIC, { scope: 'groups', groups: [USA] })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { scope: [expect.stringMatching(/^Nothing to add/)] },
    });
    // The group the first run left is still there for the next one.
    await expect(startQuickAdd(NORDIC, { scope: 'groups', groups: [AUSTRALIA] })).resolves.toMatchObject({
      total: 1,
    });
  });

  it('refuses a disabled supplier, a body without groups, an unknown scope and a run of another supplier', async () => {
    await expect(startQuickAdd(NORDIC, { scope: 'groups', groups: [] })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { groups: ['Pick at least one group.'] },
    });
    await expect(startQuickAdd(NORDIC, { scope: 'some' } as never)).rejects.toMatchObject({ status: 422 });
    await expect(startQuickAdd(99999, { scope: 'all' })).rejects.toMatchObject({ status: 404 });

    const run = await startQuickAdd(NORDIC, { scope: 'all' });
    await expect(getQuickAddRun(RAPID, run.id)).rejects.toMatchObject({ status: 404 });
    await expect(getQuickAddRun(NORDIC, 999)).rejects.toMatchObject({ status: 404 });

    await updateSupplier(GULF, { status: 'disabled' });
    await expect(startQuickAdd(GULF, { scope: 'all' })).rejects.toMatchObject({
      status: 409,
      code: 'SUPPLIER_DISABLED',
    });
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
