// Tests for the code inventory API functions and the two private lookups, run against the dev mock API: the masked list and its filters,
// the import with the server's counts, the void action, and the merchant group and merchant menus.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { groupHandlers } from '../mocks/testGroups';
import { recordRequests } from '../test/requests';
import { importInventoryCodes, listInventoryCodes, voidInventoryCodes } from '.';
import { listGroupOptions, listMerchantOptions, LOOKUP_CAP } from './lookups';

setupMockApi();
beforeEach(async () => {
  // The merchants feature serves the group list; these tests bring their own copy of it.
  mockServer.use(...groupHandlers);
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const Z3X = 15;
const UNLOCKTOOL = 16;

describe('listInventoryCodes', () => {
  it('lists the stock newest first with every code masked but its last four characters', async () => {
    const page = await listInventoryCodes({ start: 0, end: 5 });
    expect(page.total).toBe(30);
    expect(page.data).toHaveLength(5);
    for (const code of page.data) expect(code.maskedCode).toMatch(/^•+[A-Z0-9]{4}$/);
    expect(page.data.map((code) => code.createdAt)).toEqual(
      [...page.data.map((code) => code.createdAt)].sort().reverse(),
    );
    expect(page.data[0]).not.toHaveProperty('code');
  });

  it('filters by service and by status', async () => {
    const requests = recordRequests();
    const sold = await listInventoryCodes({ filters: { serviceId: UNLOCKTOOL, status: 'sold' } });
    expect(Object.fromEntries(requests.last().url.searchParams)).toEqual({ serviceId: '16', status: 'sold' });
    expect(sold.total).toBe(4);
    expect(sold.data.every((code) => code.service.id === UNLOCKTOOL && code.orderId !== null)).toBe(true);
    expect((await listInventoryCodes({ filters: { status: 'void' } })).total).toBe(2);
  });
});

describe('importInventoryCodes', () => {
  it('posts the codes and gets the server’s counts of imported, duplicate and rejected codes', async () => {
    const requests = recordRequests();
    const body = {
      codes: ['Z3X-9001-AAAA', 'Z3X-9002-BBBB', 'Z3X-9001-AAAA', 'Z3X-1000-A1B2', 'x'],
      batchRef: 'INV-9',
    };
    const result = await importInventoryCodes(Z3X, body);
    expect(requests.last()).toMatchObject({ method: 'POST', body });
    expect(requests.last().url.pathname).toBe('/admin/services/15/inventory/import');
    expect(result).toEqual({ imported: 2, duplicates: 2, rejected: 1, batchRef: 'INV-9' });
    const stock = await listInventoryCodes({ filters: { serviceId: Z3X, status: 'available' } });
    expect(stock.data.filter((code) => code.batchRef === 'INV-9')).toHaveLength(2);
  });

  it('refuses an import with no codes, and a service that does not exist', async () => {
    await expect(importInventoryCodes(Z3X, { codes: [] })).rejects.toMatchObject({ status: 422 });
    await expect(importInventoryCodes(999, { codes: ['ABCDEF'] })).rejects.toMatchObject({ status: 404 });
  });
});

describe('voidInventoryCodes', () => {
  it('voids the unsold codes and skips the others', async () => {
    const requests = recordRequests();
    const unsold = (
      await listInventoryCodes({ filters: { serviceId: Z3X, status: 'available' } })
    ).data.slice(0, 2);
    const sold = (await listInventoryCodes({ filters: { serviceId: Z3X, status: 'sold' } })).data[0];
    const ids = [...unsold.map((code) => code.id), sold.id];
    expect(await voidInventoryCodes({ ids })).toEqual({ voided: 2, skipped: 1 });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { ids } });
    expect(requests.last().url.pathname).toBe('/admin/inventory-codes/void');
    expect((await listInventoryCodes({ filters: { serviceId: Z3X, status: 'void' } })).total).toBe(3);
  });

  it('refuses a request with no ids', async () => {
    await expect(voidInventoryCodes({ ids: [] })).rejects.toMatchObject({ status: 422 });
  });
});

describe('the private lookups', () => {
  it('reads the merchant groups with their discount and merchants', async () => {
    const requests = recordRequests();
    const groups = await listGroupOptions();
    expect(requests.last().url.pathname).toBe('/admin/client-groups');
    expect(Object.fromEntries(requests.last().url.searchParams)).toMatchObject({
      _start: '0',
      _end: String(LOOKUP_CAP),
    });
    expect(groups.data.map((group) => [group.name, group.discountPercent, group.merchantCount])).toEqual([
      ['Standard', '0.00', 11],
      ['Wholesale', '4.00', 6],
      ['VIP', '8.00', 3],
    ]);
  });

  it('reads the merchants by name', async () => {
    const requests = recordRequests();
    const merchants = await listMerchantOptions();
    expect(requests.last().url.pathname).toBe('/admin/clients');
    expect(requests.last().url.searchParams.get('_sort')).toBe('name');
    expect(merchants.data).toHaveLength(merchants.total);
    expect(merchants.data.map((merchant) => merchant.name)).toContain('Cairo GSM Lab');
  });
});
