// Tests of the categories read (one request for the largest page the server gives, 1000 rows, so a long list of groups is read whole) and
// of the stock service menu (the server filters it: `stockDelivery=true`, and the kind, instead of the browser sifting the first 200 names).
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { listServices } from '../api';
import { AppWrapper } from '../test/AppWrapper';
import { recordRequests } from '../test/requests';
import { isStockMenuShort, useCategories, useStockServiceChoices } from './useChoices';

setupMockApi();
afterEach(() => vi.restoreAllMocks());

describe('useCategories', () => {
  it('asks for 1000 rows from the start, in the order of the positions', async () => {
    await signInAs();
    const requests = recordRequests();
    const { result } = renderHook(() => useCategories(), { wrapper: AppWrapper });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    const read = requests
      .sent()
      .find((request) => request.url.pathname.endsWith('/admin/service-categories'));
    expect(read?.method).toBe('GET');
    expect(Object.fromEntries(read?.url.searchParams ?? [])).toMatchObject({
      _start: '0',
      _end: '1000',
      _sort: 'sort',
      _order: 'asc',
    });
    expect(result.current.categories.length).toBeGreaterThan(0);
  });
});

describe('useStockServiceChoices', () => {
  const listed = (requests: ReturnType<typeof recordRequests>) =>
    requests.sent().filter((request) => request.url.pathname === '/admin/services');

  it('asks the server for the services delivered from code stock, of the kind, by name, 200 at most', async () => {
    await signInAs();
    const requests = recordRequests();
    const { result } = renderHook(() => useStockServiceChoices(true, 'server'), { wrapper: AppWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [read, ...others] = listed(requests);
    expect(others).toEqual([]);
    expect(read?.method).toBe('GET');
    expect(Object.fromEntries(read?.url.searchParams ?? [])).toMatchObject({
      stockDelivery: 'true',
      type: 'server',
      _start: '0',
      _end: '200',
      _sort: 'name',
      _order: 'asc',
    });
    expect(result.current.data?.services.map((service) => service.name)).toEqual([
      'UnlockTool 1-Day License',
      'Z3X Credits x10',
    ]);
    expect(result.current.data?.total).toBe(2);
  });

  it('leaves the kind out when none is asked for, and finds none of another kind', async () => {
    await signInAs();
    const requests = recordRequests();
    const all = renderHook(() => useStockServiceChoices(true), { wrapper: AppWrapper });
    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    expect(listed(requests)[0]?.url.searchParams.has('type')).toBe(false);
    expect(all.result.current.data?.services).toHaveLength(2);
    const imei = renderHook(() => useStockServiceChoices(true, 'imei'), { wrapper: AppWrapper });
    await waitFor(() => expect(imei.result.current.isSuccess).toBe(true));
    expect(imei.result.current.data).toEqual({ services: [], total: 0 });
  });

  it('keeps what the server sends and does not sift it again in the browser', async () => {
    await signInAs();
    const rows = (await listServices({ end: 2 })).data.map((row) => ({ ...row, stockDelivery: false }));
    mockServer.use(http.get('*/admin/services', () => HttpResponse.json(rows, { headers: TOTAL(40) })));
    const { result } = renderHook(() => useStockServiceChoices(true), { wrapper: AppWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.services).toHaveLength(2);
    // The server counts forty: the menu holds two, so it is a short list.
    expect(result.current.data?.total).toBe(40);
    expect(isStockMenuShort(result.current.data)).toBe(true);
  });
});

describe('isStockMenuShort', () => {
  it('is true only when the server counts more services than the menu holds', () => {
    expect(isStockMenuShort(undefined)).toBe(false);
    expect(isStockMenuShort({ services: [], total: 0 })).toBe(false);
    const rows = [{ id: 1 }, { id: 2 }] as never[];
    expect(isStockMenuShort({ services: rows, total: 2 })).toBe(false);
    expect(isStockMenuShort({ services: rows, total: 3 })).toBe(true);
  });
});

const TOTAL = (count: number) => ({
  'x-total-count': String(count),
  'access-control-expose-headers': 'x-total-count',
});
