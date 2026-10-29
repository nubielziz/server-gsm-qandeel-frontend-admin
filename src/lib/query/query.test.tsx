// Tests for useApiQuery / useApiMutation: retries, invalidation and toasts.
import { Refine, type AuthProvider, type NotificationProvider } from '@refinedev/core';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { shouldRetryApiQuery, useApiQuery } from './useApiQuery';
import { useApiMutation } from './useApiMutation';
import { errorToast } from './toast';

function setup() {
  const open = vi.fn();
  const onError = vi.fn(async (_error: unknown) => ({}));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const notificationProvider: NotificationProvider = { open, close: vi.fn() };
  const authProvider = { onError, check: async () => ({ authenticated: true }) } as unknown as AuthProvider;
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
  return { Wrapper, open, onError, invalidate };
}

describe('useApiMutation', () => {
  it('toasts the success text and refreshes the given resources and keys', async () => {
    const { Wrapper, open, invalidate } = setup();
    const { result } = renderHook(
      () =>
        useApiMutation<{ id: number }, number>({
          mutationFn: async (id) => ({ id }),
          invalidates: [{ resource: 'staff', id: 7 }],
          invalidateKeys: [['api', 'staff', 'sessions']],
          successNotification: (data) => ({ message: 'Staff suspended', description: `Staff ${data.id}` }),
        }),
      { wrapper: Wrapper },
    );
    await result.current.mutateAsync(7);
    expect(open).toHaveBeenCalledWith({
      type: 'success',
      message: 'Staff suspended',
      description: 'Staff 7',
    });
    const keys = invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(keys.some((key) => key.includes('"staff"'))).toBe(true);
    expect(keys).toContain(JSON.stringify(['api', 'staff', 'sessions']));
  });

  it('accepts a function for what to refresh', async () => {
    const { Wrapper, invalidate } = setup();
    const { result } = renderHook(
      () =>
        useApiMutation<{ id: number }, number>({
          mutationFn: async (id) => ({ id }),
          invalidates: (data) => [{ resource: 'orders', id: data.id, invalidates: ['detail'] }],
        }),
      { wrapper: Wrapper },
    );
    await result.current.mutateAsync(3);
    expect(invalidate).toHaveBeenCalled();
    expect(JSON.stringify(invalidate.mock.calls[0][0]?.queryKey)).toContain('"orders"');
  });

  it('shows the server error as a toast by default and tells the auth provider', async () => {
    const { Wrapper, open, onError } = setup();
    const failure = new ApiError({
      status: 409,
      title: 'Conflict',
      detail: 'Already suspended.',
      requestId: 'req-9',
    });
    const { result } = renderHook(
      () => useApiMutation<void, void>({ mutationFn: async () => Promise.reject(failure) }),
      { wrapper: Wrapper },
    );
    await expect(result.current.mutateAsync()).rejects.toBe(failure);
    expect(open).toHaveBeenCalledWith({
      type: 'error',
      message: 'Conflict',
      description: 'Already suspended. Request ID: req-9',
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0]).toBe(failure);
  });

  it('can silence the toast, and stays quiet on 401 because the user is signed out instead', async () => {
    const { Wrapper, open } = setup();
    const silent = renderHook(
      () =>
        useApiMutation<void, void>({
          mutationFn: async () => Promise.reject(new ApiError({ status: 422 })),
          errorNotification: () => false,
        }),
      { wrapper: Wrapper },
    );
    await expect(silent.result.current.mutateAsync()).rejects.toBeInstanceOf(ApiError);
    const unauthorized = renderHook(
      () =>
        useApiMutation<void, void>({ mutationFn: async () => Promise.reject(new ApiError({ status: 401 })) }),
      { wrapper: Wrapper },
    );
    await expect(unauthorized.result.current.mutateAsync()).rejects.toBeInstanceOf(ApiError);
    expect(open).not.toHaveBeenCalled();
  });
});

describe('useApiQuery', () => {
  it('returns the data', async () => {
    const { Wrapper } = setup();
    const { result } = renderHook(
      () => useApiQuery({ queryKey: ['api', 'system', 'health'], queryFn: async () => ({ status: 'ok' }) }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.data).toEqual({ status: 'ok' }));
  });

  it('passes an error to the auth provider so a 401 can sign the user out', async () => {
    const { Wrapper, onError } = setup();
    const failure = new ApiError({ status: 401, code: 'UNAUTHORIZED' });
    const { result } = renderHook(
      () =>
        useApiQuery({
          queryKey: ['api', 'reports', 'profit'],
          queryFn: async () => Promise.reject(failure),
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.error).toBe(failure));
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0]).toBe(failure);
  });
});

describe('shouldRetryApiQuery', () => {
  it('never retries a 4xx', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      expect(shouldRetryApiQuery(0, new ApiError({ status }))).toBe(false);
    }
  });

  it('retries a network failure or a 5xx once', () => {
    for (const status of [0, 500, 502, 503]) {
      expect(shouldRetryApiQuery(0, new ApiError({ status }))).toBe(true);
      expect(shouldRetryApiQuery(1, new ApiError({ status }))).toBe(false);
    }
  });

  it('does not retry errors that are not ApiErrors', () => {
    expect(shouldRetryApiQuery(0, new Error('bug'))).toBe(false);
  });
});

describe('errorToast', () => {
  it('shows the wait time for a rate limit', () => {
    expect(errorToast(new ApiError({ status: 429, title: 'Slow down', retryAfter: 30 }))).toEqual({
      message: 'Slow down',
      description: 'Too many requests. Try again in 30 seconds.',
    });
    expect(
      errorToast(new ApiError({ status: 429, code: 'RATE_LIMITED', title: 'Slow', retryAfter: 300 }))
        .description,
    ).toBe('Too many requests. Try again in 5 minutes.');
    expect(errorToast(new ApiError({ status: 429, title: 'Slow' })).description).toBe(
      'Too many requests. Try again in a moment.',
    );
  });

  it('shows title and detail otherwise', () => {
    expect(errorToast(new ApiError({ status: 500, title: 'Boom' }))).toEqual({
      message: 'Boom',
      description: undefined,
    });
  });
});
