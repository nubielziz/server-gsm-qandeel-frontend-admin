// Tests for the Money back count: refunds to decide or retry and disputes that need evidence, read from the dev mock API, and no call
// for a count the staff member may not read.
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/App';
import { mockServer } from '@/mocks/node';
import { mockMe, setupMockApi, signInAs } from '@/test/renderApp';
import { useMoneyBackWaiting } from './useMoneyBackWaiting';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AppProviders>{children}</AppProviders>
    </MemoryRouter>
  );
}

/** The paths the hook asked the server for, so a test can see which counts were read. */
function watchRequests() {
  const paths: string[] = [];
  mockServer.events.on('request:start', ({ request }) => {
    paths.push(new URL(request.url).pathname);
  });
  return paths;
}

describe('useMoneyBackWaiting', () => {
  it('counts the refunds to decide or retry and the disputes that need evidence', async () => {
    await signInAs();
    const { result } = renderHook(() => useMoneyBackWaiting(), { wrapper });
    // Nothing is known before the first answers.
    expect(result.current).toEqual({ refunds: undefined, disputes: undefined });
    // The seed has 3 requested refunds and 1 failed one, and 2 disputes waiting for evidence.
    await waitFor(() => expect(result.current).toEqual({ refunds: 4, disputes: 2 }));
  });

  it('reads no refunds for a role that can only read disputes', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['disputes:read'] });
    const paths = watchRequests();
    const { result } = renderHook(() => useMoneyBackWaiting(), { wrapper });
    await waitFor(() => expect(result.current.disputes).toBe(2));
    expect(result.current.refunds).toBeUndefined();
    expect(paths.some((path) => path.endsWith('/admin/refunds'))).toBe(false);
  });

  it('reads no disputes for a role that can only read refunds', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['refunds:read'] });
    const paths = watchRequests();
    const { result } = renderHook(() => useMoneyBackWaiting(), { wrapper });
    await waitFor(() => expect(result.current.refunds).toBe(4));
    expect(result.current.disputes).toBeUndefined();
    expect(paths.some((path) => path.endsWith('/admin/disputes'))).toBe(false);
  });

  it('shows nothing and asks for nothing without either permission', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['reports:finance'] });
    const paths = watchRequests();
    const { result } = renderHook(() => useMoneyBackWaiting(), { wrapper });
    await waitFor(() => expect(paths.some((path) => path.endsWith('/admin/auth/me'))).toBe(true));
    expect(result.current).toEqual({ refunds: undefined, disputes: undefined });
    expect(paths.some((path) => /\/admin\/(refunds|disputes)$/.test(path))).toBe(false);
  });
});
