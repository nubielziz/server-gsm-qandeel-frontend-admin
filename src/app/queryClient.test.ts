// Tests for the app's QueryClient: retry rules and the no-refetch rule of Refine's auth check.
import { describe, expect, it } from 'vitest';
import { createQueryClient } from './queryClient';

describe('createQueryClient', () => {
  it('never refetches the "signed in?" check on its own, so the shell is not swapped for its loading screen', () => {
    const client = createQueryClient();
    expect(client.getQueryDefaults(['auth', 'check'])).toMatchObject({
      staleTime: Infinity,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    });
  });

  it('leaves identity and permissions on the normal rules, so a failed first load recovers on reconnect', () => {
    const client = createQueryClient();
    expect(client.getQueryDefaults(['auth', 'identity']).refetchOnReconnect).toBeUndefined();
  });

  it('gives each app mount its own cache', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
