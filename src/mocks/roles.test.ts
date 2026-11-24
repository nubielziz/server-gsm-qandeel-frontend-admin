// Tests for the demo roles' permissions after the merge: the Accounts area is one family (`clients`, `wallet`, `groups`, `api_keys`) with the
// privacy permission added at the manage level, the catalog lists the new permissions, and no role keeps the old customer family.
import { describe, expect, it } from 'vitest';
import { PERMISSION_CATALOG, permissionsOf } from './roles';

describe('the catalog', () => {
  it('lists the accounts family with the block action, and the privacy permission alone under customers', () => {
    expect(PERMISSION_CATALOG).toEqual(
      expect.arrayContaining([
        'clients:read',
        'clients:create',
        'clients:update',
        'clients:security',
        'clients:block',
        'customers:privacy',
        'groups:read',
        'wallet:adjust',
      ]),
    );
    expect(PERMISSION_CATALOG.filter((permission) => permission.startsWith('customers:'))).toEqual([
      'customers:privacy',
    ]);
  });
});

describe('permissionsOf', () => {
  it('gives the Owner everything and nobody else the star', () => {
    expect(permissionsOf('owner')).toEqual(['*']);
    for (const role of ['admin', 'finance', 'support', 'risk', 'viewer']) {
      expect(permissionsOf(role)).not.toContain('*');
    }
  });

  it('gives the manage level of the Accounts area its four families and the privacy permission', () => {
    const admin = permissionsOf('admin');
    expect(admin).toEqual(
      expect.arrayContaining(['clients:*', 'wallet:*', 'groups:*', 'api_keys:*', 'customers:privacy']),
    );
    expect(admin).not.toContain('customers:*');
    expect(permissionsOf('support')).toEqual(expect.arrayContaining(['clients:*', 'customers:privacy']));
  });

  it('gives the view level only the reads, and no privacy permission', () => {
    const finance = permissionsOf('finance');
    expect(finance).toEqual(
      expect.arrayContaining(['clients:read', 'wallet:read', 'groups:read', 'api_keys:read']),
    );
    expect(finance).not.toContain('customers:privacy');
    expect(finance).not.toContain('customers:read');
  });
});
