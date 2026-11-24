// A test of what creating a key keeps in the cache: its answer holds the full key, so once the dialog lets go of the mutation it must
// be gone (`gcTime: 0`), not kept for the default five minutes. Run against the dev mock API.
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { AppWrapper } from '../test/AppWrapper';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { useCreateClientApiKey } from './useClientApiKeys';

setupMockApi();
installMerchantMocks();

describe('useCreateClientApiKey', () => {
  it('drops the new key from the mutation cache when the dialog lets go of it', async () => {
    await signInAs();
    const { result, unmount } = renderHook(
      () => ({ create: useCreateClientApiKey(), client: useQueryClient() }),
      { wrapper: AppWrapper },
    );
    const { client } = result.current;
    const created = await act(() =>
      result.current.create.mutateAsync({
        client: { id: 1, name: 'Zain Mobile Hub' },
        body: { name: 'Server' },
      }),
    );
    expect(created.secret).toMatch(/^gsm_[A-Za-z0-9]{44}$/);
    expect(created.key).toMatchObject({ clientId: 1, createdByStaff: true, rateLimitPerMin: 60 });
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
