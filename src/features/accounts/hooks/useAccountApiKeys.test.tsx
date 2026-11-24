// A test of what creating a key keeps in the cache: its answer holds the full key, so once the dialog lets go of the mutation it must be
// gone (`gcTime: 0`), not kept for the default five minutes. Run against the dev mock API.
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { SEED } from '../test/apiSupport';
import { AppWrapper } from '../test/AppWrapper';
import { installAccountMocks } from '../test/installAccountMocks';
import { useCreateAccountApiKey } from './useAccountApiKeys';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

describe('useCreateAccountApiKey', () => {
  it('drops the new key from the mutation cache when the dialog lets go of it', async () => {
    const { result, unmount } = renderHook(
      () => ({ create: useCreateAccountApiKey(), client: useQueryClient() }),
      {
        wrapper: AppWrapper,
      },
    );
    const { client } = result.current;
    const created = await act(() =>
      result.current.create.mutateAsync({
        account: { id: SEED.ZAIN, name: 'Zain Mobile Hub', email: 'ops@zainmobilehub.example' },
        body: { name: 'Server' },
      }),
    );
    expect(created.secret).toMatch(/^gsm_[A-Za-z0-9]{44}$/);
    expect(created.key).toMatchObject({ clientId: SEED.ZAIN, createdByStaff: true, rateLimitPerMin: 60 });
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((m) => m.state.data),
      ),
    ).toContain(created.secret);
    unmount();
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
    expect(
      client
        .getQueryCache()
        .getAll()
        .some((query) => JSON.stringify(query.state.data ?? '').includes(created.secret)),
    ).toBe(false);
  });
});
