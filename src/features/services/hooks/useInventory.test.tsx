// A test of what the import keeps in the cache: the pasted codes are the call's variables, in plain text, so once the dialog lets go of the
// mutation it must be gone (`gcTime: 0`), not kept for the default five minutes.
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { AppWrapper } from '../test/AppWrapper';
import { useImportCodes } from './useInventory';

setupMockApi();

const SECRET = 'UT-8001-SECRET';

describe('useImportCodes', () => {
  it('drops the plaintext codes from the mutation cache when the dialog lets go of it', async () => {
    await signInAs();
    const { result, unmount } = renderHook(
      () => ({ importCodes: useImportCodes(), client: useQueryClient() }),
      { wrapper: AppWrapper },
    );
    const { client } = result.current;
    const answer = await act(() =>
      result.current.importCodes.mutateAsync({ serviceId: 16, body: { codes: [SECRET] } }),
    );
    expect(answer).toMatchObject({ imported: 1 });
    // While the dialog holds it, the mutation is there with its variables.
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((m) => m.state.variables),
      ),
    ).toContain(SECRET);
    unmount();
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
  });
});
