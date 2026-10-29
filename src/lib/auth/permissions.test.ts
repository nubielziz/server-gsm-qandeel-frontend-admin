// Tests for permission matching (wildcards, any-of) and the CRUD operation mapping.
import { describe, expect, it } from 'vitest';
import { crudPermission, hasPermission } from './permissions';

describe('hasPermission', () => {
  it('matches an exact permission', () => {
    expect(hasPermission(['orders:read'], 'orders:read')).toBe(true);
    expect(hasPermission(['orders:read'], 'orders:update')).toBe(false);
  });

  it('lets area:* cover every action of that area only', () => {
    expect(hasPermission(['staff:*'], 'staff:suspend')).toBe(true);
    expect(hasPermission(['staff:*'], 'staff:*')).toBe(true);
    expect(hasPermission(['staff:*'], 'staffing:read')).toBe(false);
    expect(hasPermission(['staff:*'], 'orders:read')).toBe(false);
  });

  it('lets * and *:* cover everything', () => {
    expect(hasPermission(['*'], 'anything:at_all')).toBe(true);
    expect(hasPermission(['*:*'], 'orders:read')).toBe(true);
  });

  it('does not let a single action stand for the whole area', () => {
    expect(hasPermission(['orders:read'], 'orders:*')).toBe(false);
  });

  it('treats an array as any-of', () => {
    expect(hasPermission(['risk:read'], ['orders:read', 'risk:read'])).toBe(true);
    expect(hasPermission(['risk:read'], ['orders:read', 'support:read'])).toBe(false);
    expect(hasPermission([], ['orders:read'])).toBe(false);
  });

  it('grants nothing without permissions', () => {
    expect(hasPermission([], 'orders:read')).toBe(false);
  });
});

describe('crudPermission', () => {
  it('maps a wildcard row to the permission of each operation', () => {
    expect(crudPermission('staff:*', 'list')).toBe('staff:read');
    expect(crudPermission('staff:*', 'show')).toBe('staff:read');
    expect(crudPermission('staff:*', 'create')).toBe('staff:create');
    expect(crudPermission('staff:*', 'edit')).toBe('staff:update');
    expect(crudPermission('staff:*', 'update')).toBe('staff:update');
    expect(crudPermission('staff:*', 'delete')).toBe('staff:delete');
  });

  it('keeps a specific permission as it is', () => {
    expect(crudPermission('orders:read', 'list')).toBe('orders:read');
    expect(crudPermission('orders:update', 'delete')).toBe('orders:update');
  });

  it('keeps the wildcard for an operation it does not know', () => {
    expect(crudPermission('staff:*', 'export')).toBe('staff:*');
    expect(crudPermission('staff:*', 'constructor')).toBe('staff:*');
  });
});
