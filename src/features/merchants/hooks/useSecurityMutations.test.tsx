// A test of what the password mutation keeps in the cache: its answer may hold a temporary password, so once the dialog lets go of the
// mutation it must be gone (`gcTime: 0`), not kept for the default five minutes. Run against the dev mock API.
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { AppWrapper } from '../test/AppWrapper';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { useSetClientPassword } from './useSecurityMutations';

setupMockApi();
installMerchantMocks();

describe('useSetClientPassword', () => {
  it('drops the temporary password from the mutation cache when the dialog lets go of it', async () => {
    await signInAs();
    const { result, unmount } = renderHook(
      () => ({ setPassword: useSetClientPassword(), client: useQueryClient() }),
      { wrapper: AppWrapper },
    );
    const { client } = result.current;
    const answer = await act(() =>
      result.current.setPassword.mutateAsync({
        client: { id: 1, name: 'Zain Mobile Hub', email: 'ops@zainmobilehub.example' },
        body: { mode: 'temporary_password', revokeSessions: false },
      }),
    );
    expect(answer.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    // While the dialog holds it, the answer is in the mutation.
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((m) => m.state.data),
      ),
    ).toContain(answer.temporaryPassword);
    unmount();
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
    expect(
      client
        .getQueryCache()
        .getAll()
        .some((query) => JSON.stringify(query.state.data ?? '').includes(answer.temporaryPassword ?? '?')),
    ).toBe(false);
  });
});
