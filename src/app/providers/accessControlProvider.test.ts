// Tests for the access-control provider: permission strings, wildcards and page permissions.
import type { CanParams } from '@refinedev/core';
import { describe, expect, it, vi } from 'vitest';
import type { MeCache } from './meCache';
import { createAccessControlProvider, requiredPermission } from './accessControlProvider';

function providerWith(permissions: string[]) {
  const cache: MeCache = {
    get: vi.fn(async () => ({ permissions }) as never),
    peek: () => undefined,
    clear: () => {},
  };
  return createAccessControlProvider(cache);
}

// A resource as Refine passes it to `can`: only the meta matters here.
function resourceWith(permission: unknown): CanParams['params'] {
  return { resource: { name: 'staff', meta: { permission } } };
}

describe('accessControlProvider.can', () => {
  it('treats an action with a colon as the permission itself', async () => {
    const owner = providerWith(['staff:*']);
    await expect(owner.can({ resource: 'staff', action: 'staff:suspend' })).resolves.toEqual({ can: true });
    const reader = providerWith(['staff:read']);
    await expect(reader.can({ resource: 'staff', action: 'staff:suspend' })).resolves.toEqual({
      can: false,
      reason: 'You need the staff:suspend permission',
    });
  });

  it('maps CRUD actions through the resource permission', async () => {
    const reader = providerWith(['staff:read']);
    const params = resourceWith('staff:*');
    await expect(reader.can({ resource: 'staff', action: 'list', params })).resolves.toEqual({ can: true });
    await expect(reader.can({ resource: 'staff', action: 'show', params })).resolves.toEqual({ can: true });
    await expect(reader.can({ resource: 'staff', action: 'create', params })).resolves.toMatchObject({
      can: false,
      reason: 'You need the staff:create permission',
    });
    await expect(reader.can({ resource: 'staff', action: 'edit', params })).resolves.toMatchObject({
      can: false,
    });
    await expect(reader.can({ resource: 'staff', action: 'delete', params })).resolves.toMatchObject({
      can: false,
    });
  });

  it('keeps a specific page permission as it is', async () => {
    const provider = providerWith(['orders:read']);
    const params = resourceWith('orders:read');
    await expect(provider.can({ resource: 'orders', action: 'list', params })).resolves.toEqual({
      can: true,
    });
    await expect(provider.can({ resource: 'orders', action: 'edit', params })).resolves.toEqual({
      can: true,
    });
  });

  it('accepts a list of permissions as any-of', async () => {
    const provider = providerWith(['risk:read']);
    const params = resourceWith(['orders:read', 'risk:read']);
    await expect(provider.can({ resource: 'x', action: 'list', params })).resolves.toEqual({ can: true });
    const denied = await providerWith(['support:read']).can({ resource: 'x', action: 'list', params });
    expect(denied).toEqual({ can: false, reason: 'You need the orders:read or risk:read permission' });
  });

  it('lets the owner wildcard through', async () => {
    const owner = providerWith(['*']);
    await expect(owner.can({ resource: 'staff', action: 'staff:reset_2fa' })).resolves.toEqual({ can: true });
  });

  it('allows a resource that declares no permission, because the server decides', async () => {
    const provider = providerWith([]);
    await expect(provider.can({ resource: 'misc', action: 'list' })).resolves.toEqual({ can: true });
    await expect(
      provider.can({ resource: 'misc', action: 'list', params: resourceWith(undefined) }),
    ).resolves.toEqual({
      can: true,
    });
  });

  it('fails (instead of answering "no") when the permissions cannot be loaded', async () => {
    // React Query then keeps the last good answer and the page gate offers a retry, rather than a false "no access".
    const failing: MeCache = {
      get: async () => {
        throw new Error('503');
      },
      peek: () => undefined,
      clear: () => {},
    };
    const provider = createAccessControlProvider(failing);
    await expect(provider.can({ resource: 'staff', action: 'staff:read' })).rejects.toThrow('503');
  });
});

describe('requiredPermission', () => {
  it('is undefined when nothing names a permission', () => {
    expect(requiredPermission({ resource: 'x', action: 'list' })).toBeUndefined();
  });
});
