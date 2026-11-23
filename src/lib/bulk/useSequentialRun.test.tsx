// Tests for the sequential run hook: progress while it runs, one refresh at the end, and failures reported to the auth provider.
import { Refine, type AuthProvider } from '@refinedev/core';
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { useSequentialRun } from './useSequentialRun';

function setup() {
  const onError = vi.fn(async (_error: unknown) => ({}));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authProvider = { onError, check: async () => ({ authenticated: true }) } as unknown as AuthProvider;
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Refine
        dataProvider={{ getApiUrl: () => '' } as never}
        authProvider={authProvider}
        options={{ disableTelemetry: true, reactQuery: { clientConfig: queryClient } }}
      >
        {children}
      </Refine>
    );
  }
  return { Wrapper, onError };
}

describe('useSequentialRun', () => {
  it('shows progress while the run goes and clears it at the end, then refreshes once with every id', async () => {
    const { Wrapper } = setup();
    const refresh = vi.fn(async (_ids: readonly number[]) => {});
    const gates: (() => void)[] = [];
    const { result } = renderHook(() => useSequentialRun<number>(refresh), { wrapper: Wrapper });
    expect(result.current.progress).toBeNull();

    let finished: Promise<unknown> = Promise.resolve();
    act(() => {
      finished = result.current.run(
        'Switching off',
        [10, 11],
        () => new Promise<void>((resolve) => gates.push(resolve)),
      );
    });
    await waitFor(() =>
      expect(result.current.progress).toEqual({ verb: 'Switching off', done: 0, total: 2 }),
    );
    expect(refresh).not.toHaveBeenCalled();

    await act(async () => {
      gates[0]();
    });
    await waitFor(() =>
      expect(result.current.progress).toEqual({ verb: 'Switching off', done: 1, total: 2 }),
    );
    await act(async () => {
      gates[1]();
      await finished;
    });

    expect(result.current.progress).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith([10, 11]);
  });

  it('returns what went through and reports each failure to the auth provider', async () => {
    const { Wrapper, onError } = setup();
    const refresh = vi.fn(async () => {});
    const { result } = renderHook(() => useSequentialRun<number>(refresh), { wrapper: Wrapper });
    const refusal = new ApiError({ status: 409, code: 'CLOSED', title: 'Closed', detail: 'Closed.' });

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run('Rejecting', [1, 2, 3], async (id) => {
        if (id !== 2) throw refusal;
      });
    });

    expect(outcome).toEqual({
      done: 1,
      failed: [
        { id: 1, reason: 'Closed.' },
        { id: 3, reason: 'Closed.' },
      ],
    });
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2));
    expect(onError.mock.calls.map((call) => call[0])).toEqual([refusal, refusal]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
