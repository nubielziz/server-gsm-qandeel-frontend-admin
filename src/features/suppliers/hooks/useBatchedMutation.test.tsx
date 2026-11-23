// Tests for the batched mutation's kept answers: the answer of every batch the server gave stays, also when a later batch fails, a
// retry goes on without sending the first batches again, and a list that differs (or a reset) starts with none.
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/App';
import { setupMockApi } from '@/test/renderApp';
import { BatchStopped } from '../lib/batches';
import { useBatchedMutation } from './useBatchedMutation';

setupMockApi();

const ids = (count: number) => Array.from({ length: count }, (_, index) => index + 1);
const sum = (answers: readonly number[]) => answers.reduce((total, answer) => total + answer, 0);

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AppProviders>{children}</AppProviders>
    </MemoryRouter>
  );
}

/** A batched mutation whose "server" answers the size of each batch, and fails its `failAt`th call while `broken` is true. */
function setup(failAt: number | null) {
  const state = { calls: 0, broken: failAt !== null };
  const send = vi.fn(async (batch: number[]) => {
    state.calls += 1;
    if (state.broken && state.calls === failAt) throw new Error('The supplier is down.');
    return batch.length;
  });
  const hook = renderHook(
    () => useBatchedMutation<number, number, number>({ send, merge: sum, errorNotification: () => false }),
    { wrapper: Wrapper },
  );
  return { state, send, ...hook };
}

describe('the kept answers', () => {
  it('keeps each batch answer as it arrives, also when a later one fails, and goes on without sending the first again', async () => {
    const { result, send, state } = setup(2);
    const items = ids(1_132);
    await act(async () => {
      await expect(result.current.run(items)).rejects.toBeInstanceOf(BatchStopped);
    });
    expect(result.current.answers).toEqual([500]);
    expect(result.current.progressFor(items)).toMatchObject({ upTo: null, handled: 500, total: 1_132 });

    state.broken = false;
    let merged = 0;
    await act(async () => {
      merged = await result.current.run(items);
    });
    expect(merged).toBe(1_132);
    expect(result.current.answers).toEqual([500, 500, 132]);
    // The first batch went out once; the second twice (it failed once).
    expect(send.mock.calls.map(([batch]) => batch.length)).toEqual([500, 500, 500, 132]);
  });

  it('keeps the answers after the last batch, and starts with none for a list that differs', async () => {
    const { result } = setup(null);
    await act(async () => {
      await result.current.run(ids(3));
    });
    expect(result.current.answers).toEqual([3]);
    await act(async () => {
      await result.current.run(ids(2));
    });
    expect(result.current.answers).toEqual([2]);
  });

  it('forgets them on reset', async () => {
    const { result } = setup(null);
    await act(async () => {
      await result.current.run(ids(3));
    });
    act(() => result.current.reset());
    expect(result.current.answers).toEqual([]);
    expect(result.current.progressFor(ids(3))).toBeNull();
  });
});
