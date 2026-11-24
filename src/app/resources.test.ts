// Tests for the page resources: ids, groups, paths and permissions match the demo routes.
import { describe, expect, it } from 'vitest';
import { dataRegistry, NAV_GROUPS, resources, toPageResource } from './resources';

// The demo's ROUTES (90-app.js) with the permission each page needs (the map's permission names).
const EXPECTED: [name: string, label: string, group: string, icon: string, permission: string | string[]][] =
  [
    ['dashboard', 'Dashboard', 'Operations', 'dashboard', 'dashboard:read'],
    ['orders', 'Orders', 'Operations', 'orders', 'orders:read'],
    // One Accounts page in the place of Merchants and Customers; its list and its ranks have their own read permission, and either opens it.
    ['accounts', 'Accounts', 'Operations', 'users', ['clients:read', 'groups:read']],
    ['support', 'Support', 'Operations', 'life', 'support:read'],
    ['risk', 'Risk & checks', 'Operations', 'shield', 'risk:read'],
    // No demo page (feature 23, backend addition): campaigns and their detail.
    ['notifications', 'Notifications', 'Operations', 'bell', 'broadcasts:read'],
    // The one Product / Services page: any view's read permission opens it (the services manifest).
    [
      'products',
      'Product / Services',
      'Catalog',
      'tag',
      ['catalog:read', 'pricing:read', 'inventory:read', 'storefront:read'],
    ],
    ['suppliers', 'Suppliers', 'Catalog', 'server', 'suppliers:read'],
    [
      'finance',
      'Finance',
      'Money',
      'wallet',
      [
        'ledger:read',
        'payments:read',
        'wallet:read',
        'invoices:read',
        'reports:read',
        'reports:finance',
        'reports:growth',
      ],
    ],
    ['refunds', 'Refunds & disputes', 'Money', 'undo', ['refunds:read', 'disputes:read', 'reports:finance']],
    // Any one tab permission opens Admins & access (MISMATCHES M19).
    [
      'access',
      'Admins & access',
      'System',
      'lock',
      ['staff:read', 'access:read', 'roles:read', 'sessions:read'],
    ],
    [
      'settings',
      'Settings',
      'System',
      'sliders',
      ['settings:read', 'payments:gateways', 'tax:read', 'notifications:read'],
    ],
    // The shop's own pages, in the System group after Settings; any tab's read permission opens it (the storefront manifest).
    ['storefront', 'Shop content', 'System', 'store', ['storefront:read', 'legal:read']],
    ['audit', 'Audit log', 'System', 'history', 'audit:read'],
    // No demo page; any one of the three read permissions opens it (docs/system-health-design.md).
    ['system-health', 'System health', 'System', 'pulse', ['system:read', 'alerts:read', 'incidents:read']],
  ];

describe('page resources', () => {
  it('are the console’s pages in order: Accounts after Orders, Notifications after Risk & checks, Shop content after Settings, System health last', () => {
    expect(resources.map((resource) => resource.name)).toEqual(EXPECTED.map(([name]) => name));
  });

  it('hold Product / Services and Suppliers in the Catalog group, and Shop content in System right after Settings', () => {
    const names = (group: string) =>
      resources.filter((resource) => resource.meta?.group === group).map((resource) => resource.name);
    expect(names('Catalog')).toEqual(['products', 'suppliers']);
    expect(names('System')).toEqual(['access', 'settings', 'storefront', 'audit', 'system-health']);
  });

  it('keep no page for the old Services & pricing and Catalog names, so a name-keyed access check cannot pass by accident', () => {
    // A `can` check for a resource that does not exist answers yes, so a left-over name would let anyone through.
    expect(resources.some((resource) => resource.name === 'services')).toBe(false);
    expect(resources.some((resource) => resource.name === 'catalog')).toBe(false);
  });

  it('keep one Accounts page and no page for Merchants or Customers', () => {
    // Merchants and Customers are one page; a resource left under either name would keep a sidebar entry and let a name-keyed check pass.
    const names = resources.map((resource) => resource.name);
    expect(names.filter((name) => name === 'accounts')).toHaveLength(1);
    expect(names).not.toContain('merchants');
    expect(names).not.toContain('customers');
  });

  it('hold Accounts in the Operations group, right after Orders', () => {
    const operations = resources
      .filter((resource) => resource.meta?.group === 'Operations')
      .map((resource) => resource.name);
    expect(operations).toEqual(['dashboard', 'orders', 'accounts', 'support', 'risk', 'notifications']);
  });

  it('open Accounts to a role with the accounts read permission or the ranks read permission', () => {
    const permission = resources.find((resource) => resource.name === 'accounts')?.meta?.permission;
    expect(permission).toEqual(['clients:read', 'groups:read']);
    // The old page permission of the customers (`customers:read`) no longer opens anything.
    expect(permission).not.toContain('customers:read');
  });

  it.each(EXPECTED)('%s: label, group, icon and permission', (name, label, group, icon, permission) => {
    const resource = resources.find((candidate) => candidate.name === name);
    expect(resource?.list).toBe(`/${name}`);
    expect(resource?.meta).toEqual({ label, group, icon, permission });
  });

  it('have a detail route only for accounts and notifications', () => {
    const withDetail = resources
      .filter((resource) => resource.show)
      .map((resource) => [resource.name, resource.show]);
    expect(withDetail).toEqual([
      ['accounts', '/accounts/:id'],
      ['notifications', '/notifications/:id'],
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
    const accounts = resources.find((resource) => resource.name === 'accounts');
    expect(toPageResource(accounts)).toEqual({
      name: 'accounts',
      meta: accounts?.meta,
      path: '/accounts',
      detailPath: '/accounts/:id',
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
