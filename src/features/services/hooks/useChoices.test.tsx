// A test of the categories read: one request for the largest page the server gives (1000 rows), so a long list of groups is read whole.
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { AppWrapper } from '../test/AppWrapper';
import { recordRequests } from '../test/requests';
import { useCategories } from './useChoices';

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
