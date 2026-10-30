// Tests for the privacy mutations, run against the dev mock API: what each one makes stale once it succeeds (anonymising also
// changes the customer's orders on the server, so the orders refresh too), and that a refusal is left to the dialog (no toast).
import { Refine, type AuthProvider, type NotificationProvider } from '@refinedev/core';
import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { useAnonymizeCustomer, useExportCustomerData } from './usePrivacyMutations';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// A Refine with a query client whose invalidations can be read back, and a notification provider that records the toasts.
function setup() {
  const open = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const notificationProvider: NotificationProvider = { open, close: vi.fn() };
  const authProvider = {
    onError: async () => ({}),
    check: async () => ({ authenticated: true }),
  } as unknown as AuthProvider;
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Refine
        dataProvider={{ getApiUrl: () => '' } as never}
        authProvider={authProvider}
        notificationProvider={notificationProvider}
        options={{ disableTelemetry: true, reactQuery: { clientConfig: queryClient } }}
      >
        {children}
      </Refine>
    );
  }
  // The query keys refreshed so far, as text (Refine builds them; the resource name is in them).
  const refreshed = () => invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
  return { Wrapper, open, refreshed };
}

describe('useAnonymizeCustomer', () => {
  it('refreshes the customer, the data requests and the orders, because the server changes all three', async () => {
    const { Wrapper, refreshed } = setup();
    const { result } = renderHook(() => useAnonymizeCustomer(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 1 });
    const keys = refreshed();
    for (const resource of ['customers', 'data-requests', 'orders']) {
      expect(keys.some((key) => key.includes(`"${resource}"`))).toBe(true);
    }
    expect(keys).toContain(JSON.stringify(['api', 'customers', 'counts']));
  });

  it('leaves a refusal to the confirm dialog: no error toast', async () => {
    mockServer.use(
      http.post('*/admin/customers/:id/anonymize', () =>
        problem(409, 'OPEN_DISPUTE', 'Open dispute', 'A card dispute is still open.'),
      ),
    );
    const { Wrapper, open } = setup();
    const { result } = renderHook(() => useAnonymizeCustomer(), { wrapper: Wrapper });
    const error = await result.current.mutateAsync({ id: 1 }).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.code).toBe('OPEN_DISPUTE');
    expect(open).not.toHaveBeenCalled();
  });
});

describe('useExportCustomerData', () => {
  it('refreshes the data requests, which the export can close', async () => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { Wrapper, open, refreshed } = setup();
    const { result } = renderHook(() => useExportCustomerData(), { wrapper: Wrapper });
    await expect(result.current.mutateAsync({ id: 1 })).resolves.toBe('customer-1.json');
    expect(refreshed().some((key) => key.includes('"data-requests"'))).toBe(true);
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', message: 'Data exported' }));
  });

  it('leaves a refusal to the confirm dialog: no error toast', async () => {
    mockServer.use(
      http.get('*/admin/customers/:id/export', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You may not export customer data.'),
      ),
    );
    const { Wrapper, open } = setup();
    const { result } = renderHook(() => useExportCustomerData(), { wrapper: Wrapper });
    const error = await result.current.mutateAsync({ id: 1 }).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(403);
    expect(open).not.toHaveBeenCalled();
  });
});
