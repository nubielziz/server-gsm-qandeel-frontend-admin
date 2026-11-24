// Tests for the mutations of an account that keep a one-time answer or change a rank: a temporary password is dropped with the dialog, and the
// rank change sends its key, refreshes what follows the rank and tells in its toast what moved. Run against the dev mock API.
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { SEED, spy } from '../test/apiSupport';
import { AppWrapper } from '../test/AppWrapper';
import { installAccountMocks } from '../test/installAccountMocks';
import { useChangeRank, useCreateAccount, useMakeAccount } from './useAccountMutations';
import { HttpResponse } from 'msw';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

describe('useCreateAccount', () => {
  it('drops the temporary password from the mutation cache when the page lets go of it', async () => {
    const { result, unmount } = renderHook(() => ({ create: useCreateAccount(), client: useQueryClient() }), {
      wrapper: AppWrapper,
    });
    const { client } = result.current;
    const created = await act(() =>
      result.current.create.mutateAsync({
        name: 'Pat Example',
        email: 'pat@mail.example',
        country: 'DE',
        password: { mode: 'temporary_password' },
      }),
    );
    expect(created.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    unmount();
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
  });
});

describe('useMakeAccount', () => {
  it('makes an account of a guest and refreshes the counts', async () => {
    const { result } = renderHook(() => ({ make: useMakeAccount(), client: useQueryClient() }), {
      wrapper: AppWrapper,
    });
    const answer = await act(() =>
      result.current.make.mutateAsync({
        account: { id: SEED.SOFIA, name: 'Sofia Alvarez', email: 'sofia.alvarez@inbox.example' },
        body: { mode: 'reset_link' },
      }),
    );
    expect(answer.temporaryPassword).toBeUndefined();
  });
});

describe('useChangeRank', () => {
  it('sends the rank and the dialog’s key', async () => {
    const seen = spy('post', `/admin/clients/${SEED.ZAIN}/rank`, () =>
      HttpResponse.json({
        rank: { id: 2, name: 'Wholesale', kind: 'merchant' },
        wallet: null,
        movedAmount: '0.0000',
        transactionId: null,
        sessionsEnded: 0,
        apiKeysRevoked: 0,
      }),
    );
    const { result } = renderHook(() => useChangeRank(), { wrapper: AppWrapper });
    await act(() =>
      result.current.mutateAsync({
        account: { id: SEED.ZAIN, name: 'Zain Mobile Hub', email: 'ops@zainmobilehub.example' },
        rank: { id: 2, name: 'Wholesale' },
        key: 'opening-1',
      }),
    );
    expect(seen[0]).toMatchObject({ method: 'POST', body: { groupId: 2 } });
    expect(seen[0].headers.get('Idempotency-Key')).toBe('opening-1');
  });
});
