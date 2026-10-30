// Tests for the page resources: ids, groups, paths and permissions match the demo routes.
import { describe, expect, it } from 'vitest';
import { dataRegistry, NAV_GROUPS, resources, toPageResource } from './resources';

// The demo's ROUTES (90-app.js) with the permission each page needs (the map's permission names).
const EXPECTED: [name: string, label: string, group: string, icon: string, permission: string | string[]][] =
  [
    ['dashboard', 'Dashboard', 'Operations', 'dashboard', 'dashboard:read'],
    ['orders', 'Orders', 'Operations', 'orders', 'orders:read'],
    // Any tab's read permission opens Merchants (the merchants manifest; MISMATCHES, merchants rows).
    ['merchants', 'Merchants', 'Operations', 'users', ['clients:read', 'groups:read', 'kyc:read']],
    ['customers', 'Customers', 'Operations', 'user', 'customers:read'],
    ['support', 'Support', 'Operations', 'life', 'support:read'],
    ['risk', 'Risk & checks', 'Operations', 'shield', 'risk:read'],
    ['checkouts', 'Abandoned checkouts', 'Operations', 'mail', 'growth:read'],
    ['services', 'Services & pricing', 'Catalog', 'tag', ['catalog:read', 'pricing:read', 'inventory:read']],
    ['suppliers', 'Suppliers', 'Catalog', 'server', 'suppliers:read'],
    ['storefront', 'Storefront', 'Catalog', 'store', 'storefront:read'],
    ['finance', 'Finance', 'Money', 'wallet', 'ledger:read'],
    ['commissions', 'Commissions', 'Money', 'percent', 'commissions:read'],
    ['refunds', 'Refunds & disputes', 'Money', 'undo', ['refunds:read', 'disputes:read', 'reports:finance']],
    // Any one tab permission opens Admins & access (MISMATCHES M19).
    [
      'access',
      'Admins & access',
      'System',
      'lock',
      ['staff:read', 'access:read', 'roles:read', 'sessions:read'],
    ],
    ['settings', 'Settings', 'System', 'sliders', 'settings:read'],
    ['audit', 'Audit log', 'System', 'history', 'audit:read'],
  ];

describe('page resources', () => {
  it('are the demo’s 16 pages, in its order', () => {
    expect(resources.map((resource) => resource.name)).toEqual(EXPECTED.map(([name]) => name));
  });

  it.each(EXPECTED)('%s: label, group, icon and permission', (name, label, group, icon, permission) => {
    const resource = resources.find((candidate) => candidate.name === name);
    expect(resource?.list).toBe(`/${name}`);
    expect(resource?.meta).toEqual({ label, group, icon, permission });
  });

  it('have a detail route only for merchants and customers', () => {
    const withDetail = resources
      .filter((resource) => resource.show)
      .map((resource) => [resource.name, resource.show]);
    expect(withDetail).toEqual([
      ['merchants', '/merchants/:id'],
      ['customers', '/customers/:id'],
    ]);
  });

  it('use the four sidebar groups, in order', () => {
    expect(NAV_GROUPS).toEqual(['Operations', 'Catalog', 'Money', 'System']);
    const usedInOrder = [...new Set(resources.map((resource) => resource.meta?.group))];
    expect(usedInOrder).toEqual(NAV_GROUPS);
  });
});

describe('toPageResource', () => {
  it('reads a page resource with its paths', () => {
    const merchants = resources.find((resource) => resource.name === 'merchants');
    expect(toPageResource(merchants)).toEqual({
      name: 'merchants',
      meta: merchants?.meta,
      path: '/merchants',
      detailPath: '/merchants/:id',
    });
    expect(toPageResource(resources[0])?.detailPath).toBeUndefined();
  });

  it('gives undefined for anything that is not a console page', () => {
    expect(toPageResource(undefined)).toBeUndefined();
    expect(toPageResource({ name: 'staff' })).toBeUndefined();
    expect(toPageResource({ name: 'staff', list: '/staff', meta: { label: 'Staff' } })).toBeUndefined();
    expect(
      toPageResource({
        name: 'x',
        list: '/x',
        meta: { label: 'X', group: 'Elsewhere', icon: 'user', permission: 'x:read' },
      }),
    ).toBeUndefined();
  });
});

describe('dataRegistry', () => {
  it('is an object features add their registries to', () => {
    expect(typeof dataRegistry).toBe('object');
  });
});
