// Tests for the generic simple-rest mock handlers (filters, sort, paging, totals, 404s).
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiList, apiPatch, apiPost, forgetCsrfToken } from '@/lib/api';
import { applyListQuery, crudHandlers } from './crud';
import { Collection } from './db';

type Item = {
  id: number;
  name: string;
  status: 'active' | 'closed';
  total: string;
  createdAt: string;
  owner: { id: number };
  note?: string;
};

function seedItems(): Item[] {
  return Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Item ${String.fromCharCode(65 + (i % 5))}${i + 1}`,
    status: i % 3 === 0 ? 'closed' : 'active',
    total: (i * 2.5).toFixed(4),
    createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    owner: { id: (i % 4) + 1 },
  }));
}

const API = 'http://api.test';
const collection = new Collection<Item>(seedItems());
const server = setupServer(
  ...crudHandlers({ base: '/admin/items', collection, searchFields: ['name'], guard: () => null }),
  ...crudHandlers({ base: '/admin/ro', collection, ops: 'LS', guard: () => null }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', API));
afterEach(() => {
  server.resetHandlers();
  collection.reset(seedItems());
  forgetCsrfToken();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

const ids = (items: { id: number }[]) => items.map((i) => i.id);

describe('list', () => {
  it('slices by _start/_end and reports the total in x-total-count', async () => {
    const first = await apiList<Item>('/admin/items', { start: 0, end: 10 });
    expect(first.total).toBe(25);
    expect(ids(first.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const last = await apiList<Item>('/admin/items', { start: 20, end: 30 });
    expect(ids(last.data)).toEqual([21, 22, 23, 24, 25]);
  });

  it('returns everything when no range is given', async () => {
    expect((await apiList<Item>('/admin/items')).data).toHaveLength(25);
  });

  it('sorts by one or several fields, numbers numerically', async () => {
    const desc = await apiList<Item>('/admin/items', { sort: ['id'], order: ['desc'], start: 0, end: 3 });
    expect(ids(desc.data)).toEqual([25, 24, 23]);
    const byTotal = await apiList<Item>('/admin/items', {
      sort: ['total'],
      order: ['desc'],
      start: 0,
      end: 2,
    });
    expect(ids(byTotal.data)).toEqual([25, 24]);
    const multi = await apiList<Item>('/admin/items', {
      sort: ['status', 'id'],
      order: ['asc', 'desc'],
      start: 0,
      end: 3,
    });
    expect(multi.data.map((i) => [i.status, i.id])).toEqual([
      ['active', 24],
      ['active', 23],
      ['active', 21],
    ]);
  });

  it('filters on equality, with repeated keys meaning any-of', async () => {
    const closed = await apiList<Item>('/admin/items', { filters: { status: 'closed' } });
    expect(closed.total).toBe(9);
    const some = await apiList<Item>('/admin/items', { filters: { id: [2, 4, 99] } });
    expect(ids(some.data)).toEqual([2, 4]);
    const nested = await apiList<Item>('/admin/items', { filters: { 'owner.id': 1 } });
    expect(nested.data.every((i) => i.owner.id === 1)).toBe(true);
  });

  it('filters with _ne, _gte, _lte, _gt, _lt and _like', async () => {
    expect((await apiList<Item>('/admin/items', { filters: { status_ne: 'closed' } })).total).toBe(16);
    expect(ids((await apiList<Item>('/admin/items', { filters: { id_gte: 23 } })).data)).toEqual([
      23, 24, 25,
    ]);
    expect(ids((await apiList<Item>('/admin/items', { filters: { id_lte: 2 } })).data)).toEqual([1, 2]);
    expect(ids((await apiList<Item>('/admin/items', { filters: { id_gt: 23 } })).data)).toEqual([24, 25]);
    expect(ids((await apiList<Item>('/admin/items', { filters: { id_lt: 3 } })).data)).toEqual([1, 2]);
    // Money strings compare as numbers; ISO dates compare as text.
    expect((await apiList<Item>('/admin/items', { filters: { total_gte: '50.0000' } })).total).toBe(5);
    expect(
      (await apiList<Item>('/admin/items', { filters: { createdAt_gte: '2026-01-24T00:00:00.000Z' } })).total,
    ).toBe(2);
    expect(ids((await apiList<Item>('/admin/items', { filters: { name_like: 'item e' } })).data)).toEqual([
      5, 10, 15, 20, 25,
    ]);
    const range = await apiList<Item>('/admin/items', { filters: { id_gte: 5, id_lte: 7 } });
    expect(ids(range.data)).toEqual([5, 6, 7]);
  });

  it('searches q in the configured fields only, ignoring case', async () => {
    expect((await apiList<Item>('/admin/items', { q: 'ITEM B' })).total).toBe(5);
    expect((await apiList<Item>('/admin/items', { q: 'closed' })).total).toBe(0);
  });

  it('searches every text field when none are configured', async () => {
    const result = await apiList<Item>('/admin/ro', { q: 'closed' });
    expect(result.total).toBe(9);
  });

  it('counts the total after filtering and before the range', async () => {
    const result = await apiList<Item>('/admin/items', {
      filters: { status: 'active' },
      sort: ['id'],
      order: ['desc'],
      start: 0,
      end: 5,
    });
    expect(result.total).toBe(16);
    expect(ids(result.data)).toEqual([24, 23, 21, 20, 18]);
  });
});

describe('show, create, update, delete', () => {
  it('shows one row, or a 404 problem', async () => {
    await expect(apiGet<Item>('/admin/items/3')).resolves.toMatchObject({ id: 3, name: 'Item C3' });
    const error = await apiGet('/admin/items/999').catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', title: 'Not found' });
    expect((error as { requestId?: string }).requestId).toMatch(/^mock-req-/);
  });

  it('creates a row with the next id and answers 201', async () => {
    const created = await apiPost<Item>('/admin/items', { name: 'New', status: 'active', total: '1.0000' });
    expect(created).toMatchObject({ id: 26, name: 'New' });
    await expect(apiGet<Item>('/admin/items/26')).resolves.toMatchObject({ name: 'New' });
  });

  it('updates with PATCH semantics: given fields change, the rest stay', async () => {
    const updated = await apiPatch<Item>('/admin/items/2', { name: 'Renamed' });
    expect(updated).toMatchObject({ id: 2, name: 'Renamed', status: 'active' });
    await expect(apiPatch('/admin/items/999', {})).rejects.toMatchObject({ status: 404 });
  });

  it('deletes a row with 204, then answers 404', async () => {
    await expect(apiDelete('/admin/items/4')).resolves.toBeUndefined();
    await expect(apiGet('/admin/items/4')).rejects.toMatchObject({ status: 404 });
    await expect(apiDelete('/admin/items/4')).rejects.toMatchObject({ status: 404 });
    expect((await apiList('/admin/items')).total).toBe(24);
  });

  it('serves only the operations asked for', async () => {
    await expect(apiGet('/admin/ro/1')).resolves.toMatchObject({ id: 1 });
    await expect(apiPost('/admin/ro', {})).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('toDto and guard', () => {
  it('filters and sorts on the DTO shape the client sees', async () => {
    server.use(
      ...crudHandlers({
        base: '/admin/dto',
        collection,
        toDto: (row: Item) => ({ id: row.id, label: row.name.toUpperCase() }),
        guard: () => null,
      }),
    );
    const result = await apiList<{ id: number; label: string }>('/admin/dto', {
      filters: { label: 'ITEM A1' },
    });
    expect(result.data).toEqual([{ id: 1, label: 'ITEM A1' }]);
  });

  it('lets the guard refuse a request', async () => {
    server.use(
      ...crudHandlers({
        base: '/admin/locked',
        collection,
        guard: () => new Response(null, { status: 418 }),
      }),
    );
    await expect(apiGet('/admin/locked')).rejects.toMatchObject({ status: 418 });
  });
});

describe('applyListQuery', () => {
  const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];

  it('handles a missing _end and ignores empty sort parts', () => {
    const { page, total } = applyListQuery(rows, new URLSearchParams('_sort=n&_start=1'));
    expect(page).toEqual([{ n: 2 }, { n: 3 }]);
    expect(total).toBe(3);
    expect(applyListQuery(rows, new URLSearchParams('_sort=n&_order=desc')).page).toEqual([
      { n: 3 },
      { n: 2 },
      { n: 1 },
    ]);
    expect(applyListQuery(rows, new URLSearchParams('_sort=')).page).toEqual(rows);
  });

  it('puts missing values last', () => {
    const mixed = [{ n: 2 }, {}, { n: 1 }] as { n?: number }[];
    expect(applyListQuery(mixed, new URLSearchParams('_sort=n')).page).toEqual([{ n: 1 }, { n: 2 }, {}]);
  });
});
