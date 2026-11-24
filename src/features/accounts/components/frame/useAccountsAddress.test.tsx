// Tests for the view the address names: a view the role may not use, and an unknown one, fall back to the first view it may and replace the
// history entry; a role with no usable view gets null; the old `chip=requests` opens the Data requests view; the address of the All view is
// left alone. The hook is drawn inside a router that also reports where it is.
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ACCOUNTS_VIEW_SPECS, usableViews } from './accountsViews';
import { useAccountsAddress } from './useAccountsAddress';
import { buildGrants } from './useAccountGrants';

const usableFor = (permissions: string[]) => usableViews(buildGrants(permissions), ACCOUNTS_VIEW_SPECS);
const OWNER = usableFor(['*']);

function open(address: string, usable: ReturnType<typeof usableFor> | undefined) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[address]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const state = useAccountsAddress(usable);
      const { pathname, search } = useLocation();
      return { ...state, where: `${pathname}${search}` };
    },
    { wrapper },
  );
}

describe('useAccountsAddress', () => {
  it('waits while the permissions load', () => {
    const { result } = open('/accounts?view=ranks', undefined);
    expect(result.current.view).toBeUndefined();
    expect(result.current.where).toBe('/accounts?view=ranks');
  });

  it('opens All for a bare address, and leaves the address alone', () => {
    const { result } = open('/accounts', OWNER);
    expect(result.current.view).toBe('all');
    expect(result.current.where).toBe('/accounts');
  });

  it('opens the view the address names, and keeps the rest of the address for the view', () => {
    const { result } = open('/accounts?view=ranks&page=2', OWNER);
    expect(result.current.view).toBe('ranks');
    expect(result.current.where).toBe('/accounts?view=ranks&page=2');
    expect(open('/accounts?view=edit-rank&id=3', OWNER).result.current.view).toBe('edit-rank');
  });

  it('replaces an unknown view with the first view the role may use', async () => {
    const { result } = open('/accounts?view=nothing&q=x', OWNER);
    await waitFor(() => expect(result.current.where).toBe('/accounts'));
    expect(result.current.view).toBe('all');
  });

  it('replaces a view the role may not use with the first one it may', async () => {
    const reader = usableFor(['clients:read']);
    const { result } = open('/accounts?view=ranks', reader);
    await waitFor(() => expect(result.current.where).toBe('/accounts'));
    expect(result.current.view).toBe('all');
    const groups = open('/accounts?view=requests', usableFor(['groups:read']));
    await waitFor(() => expect(groups.result.current.where).toBe('/accounts?view=ranks'));
    expect(groups.result.current.view).toBe('ranks');
  });

  it('lands a role that holds only groups:read on Ranks, and says so for a role with no usable view', async () => {
    const groups = open('/accounts', usableFor(['groups:read']));
    expect(groups.result.current.view).toBe('ranks');
    const none = open('/accounts', usableFor(['orders:read']));
    expect(none.result.current.view).toBeNull();
    expect(none.result.current.where).toBe('/accounts');
  });

  it('opens Data requests for the old chip, and All for a role that may not use it', async () => {
    const owner = open('/accounts?chip=requests&q=x', OWNER);
    await waitFor(() => expect(owner.result.current.where).toBe('/accounts?view=requests'));
    expect(owner.result.current.view).toBe('requests');
    const reader = open('/accounts?chip=requests', usableFor(['clients:read']));
    await waitFor(() => expect(reader.result.current.where).toBe('/accounts'));
    expect(reader.result.current.view).toBe('all');
  });

  it('does not touch the old chips of the suspended and blocked tabs: the All view rewrites those', () => {
    const { result } = open('/accounts?chip=suspended', OWNER);
    expect(result.current.view).toBe('all');
    expect(result.current.where).toBe('/accounts?chip=suspended');
  });
});
