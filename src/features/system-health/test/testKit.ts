// Test support for the hook tests: a Refine around the hook with a router at a chosen address, a query client whose
// invalidations can be read back, a toast recorder and an auth provider that answers a chosen staff member. Tests only.
// Like src/test/renderApp.ts it uses createElement, because the file holds helpers, not a component module.
import { Refine, type AuthProvider, type NotificationProvider } from '@refinedev/core';
import { QueryClient } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import type { Me } from '@/features/auth';

/** A signed-in staff member with the given permissions. */
function staffWith(permissions: string[]): Me {
  return {
    id: 99,
    email: 'tester@gsm-supply.example',
    name: 'Test Operator',
    status: 'active',
    role: { id: 9, name: 'Tester' },
    permissions,
    twofaEnabled: true,
    mustChangePassword: false,
    lastLoginAt: null,
    lastLoginIp: null,
  };
}

/**
 * `Wrapper` is the `wrapper` option of `renderHook`. `open` records the toasts, `queryClient` is the client the hooks
 * use, and `refreshed()` lists the query keys invalidated so far as text (Refine builds some of them, so the resource
 * name is inside the text).
 */
export function hookKit(options: { route?: string; permissions?: string[] } = {}) {
  const { route = '/system-health', permissions = ['*'] } = options;
  const open = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const notificationProvider: NotificationProvider = { open, close: vi.fn() };
  const authProvider = {
    check: async () => ({ authenticated: true }),
    onError: async () => ({}),
    getIdentity: async () => staffWith(permissions),
  } as unknown as AuthProvider;

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      MemoryRouter,
      { initialEntries: [route] },
      createElement(
        Refine,
        {
          dataProvider: { getApiUrl: () => '' } as never,
          authProvider,
          notificationProvider,
          options: { disableTelemetry: true, reactQuery: { clientConfig: queryClient } },
        },
        children,
      ),
    );
  }

  const refreshed = () => invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
  return { Wrapper, open, queryClient, refreshed };
}
