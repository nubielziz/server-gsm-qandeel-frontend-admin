// Tests for how the services feature plugs into the app: it fills the Catalog page, and the page opens for any role that reads one of its views.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import { manifest } from './manifest';

describe('services manifest', () => {
  it('fills the Catalog page at its own name and heading', () => {
    expect(manifest.id).toBe('services');
    expect(manifest.page).toMatchObject({ name: 'catalog', heading: 'Catalog' });
  });

  it('opens the page for any one of the catalog, pricing, inventory and storefront read permissions', () => {
    const permission = manifest.page?.permission;
    expect(permission).toEqual(['catalog:read', 'pricing:read', 'inventory:read', 'storefront:read']);
    for (const held of [
      'catalog:read',
      'pricing:read',
      'inventory:read',
      'storefront:read',
      'catalog:*',
      '*',
    ]) {
      expect(hasPermission([held], permission ?? [])).toBe(true);
    }
    for (const held of ['suppliers:read', 'legal:read', 'orders:read', 'storefront:create']) {
      expect(hasPermission([held], permission ?? [])).toBe(false);
    }
  });
});
