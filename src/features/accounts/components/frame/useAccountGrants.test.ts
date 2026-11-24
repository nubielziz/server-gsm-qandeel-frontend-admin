// Tests for the grants of the Accounts page: what a list of permissions allows, the lock a control gets when it needs one the role lacks,
// the wait before the permissions are known and the Owner rule (an exact "*", never a role that lists everything).
import { describe, expect, it } from 'vitest';
import { PERMISSION_CATALOG } from '@/mocks/roles';
import { buildGrants } from './useAccountGrants';

describe('buildGrants', () => {
  it('is not ready, and allows nothing, until the permissions are known', () => {
    const grants = buildGrants(undefined);
    expect(grants.ready).toBe(false);
    expect(grants.can('clients:read')).toBe(false);
    expect(grants.isOwner).toBe(false);
    expect(buildGrants([]).ready).toBe(true);
  });

  it('answers can and canAll from the permissions, with the wildcards of the console', () => {
    const grants = buildGrants(['clients:read', 'wallet:*']);
    expect(grants.can('clients:read')).toBe(true);
    expect(grants.can('clients:update')).toBe(false);
    expect(grants.can('wallet:adjust')).toBe(true);
    expect(grants.canAll(['clients:read', 'wallet:read'])).toBe(true);
    expect(grants.canAll(['clients:read', 'orders:read'])).toBe(false);
    expect(grants.canAll([])).toBe(true);
  });

  it('locks a control with the permission it needs named, or with every missing one', () => {
    const grants = buildGrants(['clients:read']);
    expect(grants.needs('clients:read')).toEqual({ disabled: false });
    expect(grants.needs('clients:update')).toEqual({
      disabled: true,
      title: 'You need the clients:update permission',
    });
    expect(grants.needsAll('clients:read', 'clients:update', 'clients:security')).toEqual({
      disabled: true,
      title: 'You need the clients:update and clients:security permission',
    });
    expect(grants.needsAll()).toEqual({ disabled: false });
  });

  it('knows the Owner by an exact "*", not by a role that lists every permission', () => {
    expect(buildGrants(['*']).isOwner).toBe(true);
    expect(buildGrants([...PERMISSION_CATALOG]).isOwner).toBe(false);
    expect(buildGrants(['*:*']).isOwner).toBe(false);
    expect(buildGrants(['clients:*']).isOwner).toBe(false);
  });

  it('gives the Owner every lock open, and everyone else the reason', () => {
    expect(buildGrants(['*']).ownerLock('Only the Owner changes a rank.')).toEqual({ disabled: false });
    expect(buildGrants(['clients:read']).ownerLock('Only the Owner changes a rank.')).toEqual({
      disabled: true,
      title: 'Only the Owner changes a rank.',
    });
    expect(buildGrants(['*']).can('anything:at-all')).toBe(true);
  });
});
