// Tests for the view the address names: a view the role may not use, and an unknown one, fall back and replace the address (the other keys
// are dropped); a role with no usable view gets null; a bare address and the address of a usable view are left alone.
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { usableViews } from '../../lib/moneyViews';
import { useMoneyAddress } from './useMoneyAddress';

const OWNER = usableViews(['*']);

// `seen` is the view of every render, so a test can see what was mounted before the address moved.
function open(address: string, usable: ReturnType<typeof usableViews> | undefined) {
  const seen: unknown[] = [];
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[address]}>{children}</MemoryRouter>
  );
  const hook = renderHook(
    () => {
      const state = useMoneyAddress(usable);
      const { pathname, search } = useLocation();
      seen.push(state.view);
      return { ...state, where: `${pathname}${search}` };
    },
    { wrapper },
  );
  return { ...hook, seen };
}

describe('useMoneyAddress', () => {
  it('waits while the permissions load', () => {
    const { result } = open('/money?view=vat', undefined);
    expect(result.current.view).toBeUndefined();
    expect(result.current.where).toBe('/money?view=vat');
  });

  it('opens the Overview for a bare address and leaves the address alone', () => {
    const { result } = open('/money', OWNER);
    expect(result.current.view).toBe('overview');
    expect(result.current.where).toBe('/money');
  });

  it('opens the first view of a role that has no Overview, and still leaves the bare address alone', () => {
    const { result } = open('/money', usableViews(['wallet:read']));
    expect(result.current.view).toBe('store-balances');
    expect(result.current.where).toBe('/money');
  });

  it('opens the view the address names and keeps the rest of the address for the view', () => {
    const { result } = open('/money?view=deposits&status=all&payment=7', OWNER);
    expect(result.current.view).toBe('deposits');
    expect(result.current.where).toBe('/money?view=deposits&status=all&payment=7');
  });

  it('replaces an unknown view with the first view, and drops the other keys', async () => {
    const { result } = open('/money?view=nothing&q=x', OWNER);
    await waitFor(() => expect(result.current.where).toBe('/money'));
    expect(result.current.view).toBe('overview');
  });

  it('replaces a view the role may not use with the first view of the same tab it may use', async () => {
    const { result } = open('/money?view=vat&q=x', usableViews(['reports:read']));
    await waitFor(() => expect(result.current.where).toBe('/money?view=profit'));
    expect(result.current.view).toBe('profit');
  });

  it('replaces it with the first view the role may use when its tab holds none', async () => {
    const { result } = open('/money?view=ledger&page=2', usableViews(['refunds:read']));
    await waitFor(() => expect(result.current.where).toBe('/money'));
    expect(result.current.view).toBe('overview');
    const wallets = open('/money?view=ledger', usableViews(['wallet:read']));
    await waitFor(() => expect(wallets.result.current.where).toBe('/money?view=store-balances'));
  });

  it('says so for a role with no usable view, and leaves the address alone', () => {
    const { result } = open('/money?view=ledger', usableViews(['orders:read']));
    expect(result.current.view).toBeNull();
    expect(result.current.where).toBe('/money?view=ledger');
  });

  it('mounts no view while the address moves, so a view the role cannot use is never drawn', async () => {
    const { result, seen } = open('/money?view=vat', usableViews(['reports:read']));
    await waitFor(() => expect(result.current.view).toBe('profit'));
    expect(seen[0]).toBeUndefined();
    expect(seen).not.toContain('vat');
  });
});
