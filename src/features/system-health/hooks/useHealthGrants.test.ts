// Tests for the permission hints of the System health page: what `can`, `needs` and `readOnly` answer for different roles.
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { hookKit } from '../test/testKit';
import { useHealthGrants, WRITE_PERMISSIONS } from './useHealthGrants';

async function grantsFor(permissions: string[]) {
  const { Wrapper } = hookKit({ permissions });
  const view = renderHook(() => useHealthGrants(), { wrapper: Wrapper });
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return view.result.current;
}

describe('useHealthGrants', () => {
  it('is not ready until the staff member has loaded, and a loading page is not read-only', async () => {
    const { Wrapper } = hookKit({ permissions: ['system:read'] });
    const { result } = renderHook(() => useHealthGrants(), { wrapper: Wrapper });
    expect(result.current.ready).toBe(false);
    expect(result.current.readOnly).toBe(false);
    expect(result.current.can('system:read')).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
  });

  it('is read-only for a role that can only read', async () => {
    const grants = await grantsFor(['system:read', 'alerts:read', 'incidents:read']);
    expect(grants.readOnly).toBe(true);
    expect(grants.can('system:read')).toBe(true);
    expect(grants.can('system:manage')).toBe(false);
  });

  it.each(WRITE_PERMISSIONS)('is not read-only with %s alone', async (permission) => {
    const grants = await grantsFor(['system:read', permission]);
    expect(grants.readOnly).toBe(false);
  });

  it('is not read-only for an owner, and an area grant counts', async () => {
    expect((await grantsFor(['*'])).readOnly).toBe(false);
    expect((await grantsFor(['alerts:*'])).readOnly).toBe(false);
  });

  it('answers a list of permissions as "any of them"', async () => {
    const grants = await grantsFor(['alerts:update']);
    expect(grants.can(['system:manage', 'alerts:update'])).toBe(true);
    expect(grants.can(['system:manage', 'incidents:update'])).toBe(false);
  });

  it('gives a control it may use no hint, and a control it may not use a disabled state naming the permission', async () => {
    const grants = await grantsFor(['system:read', 'alerts:update']);
    expect(grants.needs('alerts:update')).toEqual({ disabled: false });
    expect(grants.needs('system:manage')).toEqual({
      disabled: true,
      title: 'You need the system:manage permission',
    });
  });
});
