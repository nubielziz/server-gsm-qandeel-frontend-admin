// Tests for the permission helpers: reading the server's list, grouping for the role dialog, and the role summary.
import { describe, expect, it } from 'vitest';
import {
  actionOf,
  areaLevel,
  areaNames,
  describeRole,
  groupPermissions,
  humanize,
  normalisePermissions,
  OTHER_GROUP,
  prefixOf,
  ROLE_AREAS,
  sameMembers,
} from './permissions';

describe('prefixOf, actionOf, humanize', () => {
  it('splits a key at the first colon', () => {
    expect(prefixOf('staff:read')).toBe('staff');
    expect(actionOf('staff:read')).toBe('read');
    expect(prefixOf('*')).toBe('');
    expect(actionOf('*')).toBe('*');
    expect(actionOf('a:b:c')).toBe('b:c');
  });

  it('makes a readable word', () => {
    expect(humanize('credit_limit')).toBe('Credit limit');
    expect(humanize('read')).toBe('Read');
    expect(humanize('')).toBe('');
  });
});

describe('normalisePermissions', () => {
  it('accepts plain keys', () => {
    expect(normalisePermissions(['staff:read', 'wallet:credit_limit'])).toEqual([
      { key: 'staff:read', label: 'Read', group: 'staff' },
      { key: 'wallet:credit_limit', label: 'Credit limit', group: 'wallet' },
    ]);
  });

  it('accepts objects, keeping the label and group the server gave', () => {
    expect(
      normalisePermissions([
        { key: 'staff:suspend', label: 'Suspend admins', group: 'Admin accounts' },
        { key: 'staff:read' },
      ]),
    ).toEqual([
      { key: 'staff:suspend', label: 'Suspend admins', group: 'Admin accounts' },
      { key: 'staff:read', label: 'Read', group: 'staff' },
    ]);
  });

  it('drops blank and repeated keys and copes with a missing answer', () => {
    expect(normalisePermissions(['a:b', ' a:b ', '', '  '])).toEqual([
      { key: 'a:b', label: 'B', group: 'a' },
    ]);
    expect(normalisePermissions(undefined)).toEqual([]);
    expect(normalisePermissions(null)).toEqual([]);
  });
});

describe('groupPermissions', () => {
  const catalog = normalisePermissions(['staff:read', 'staff:create', 'api_keys:read', 'audit:read']);

  it('groups by prefix, A to Z by title, keeping the order inside a group', () => {
    const groups = groupPermissions(catalog, []);
    expect(groups.map((group) => group.title)).toEqual(['Api keys', 'Audit', 'Staff']);
    expect(groups[2].items.map((item) => item.key)).toEqual(['staff:read', 'staff:create']);
  });

  it('puts entries that are not in the catalog in a last group, but leaves the wildcard to its own switch', () => {
    const groups = groupPermissions(catalog, ['staff:read', 'orders:*', 'orders:*', '*']);
    const other = groups[groups.length - 1];
    expect(other.id).toBe(OTHER_GROUP);
    expect(other.items.map((item) => item.key)).toEqual(['orders:*']);
    expect(groupPermissions(catalog, ['*']).some((group) => group.id === OTHER_GROUP)).toBe(false);
  });
});

describe('areaLevel', () => {
  const catalog = normalisePermissions([
    'orders:read',
    'orders:update',
    'orders:reopen',
    'support:read',
    'support:reply',
    'risk:read',
  ]);
  const area = (name: string) => ROLE_AREAS.find((candidate) => candidate.name === name)!;

  it('is full for the wildcard, whatever the catalog holds', () => {
    expect(areaLevel({ permissions: ['*'] }, area('Orders'), [])).toBe('full');
  });

  it('is full when every permission of the area is granted, directly or by a wildcard on the prefix', () => {
    expect(
      areaLevel({ permissions: ['orders:read', 'orders:update', 'orders:reopen'] }, area('Orders'), catalog),
    ).toBe('full');
    expect(areaLevel({ permissions: ['orders:*'] }, area('Orders'), catalog)).toBe('full');
  });

  it('is view when only read permissions are granted', () => {
    expect(areaLevel({ permissions: ['orders:read'] }, area('Orders'), catalog)).toBe('view');
    expect(areaLevel({ permissions: ['risk:read'] }, area('Risk'), catalog)).toBe('full');
  });

  it('is partial for any other mix, and none when nothing in the area is granted', () => {
    expect(areaLevel({ permissions: ['orders:read', 'orders:update'] }, area('Orders'), catalog)).toBe(
      'partial',
    );
    expect(areaLevel({ permissions: ['support:reply'] }, area('Support'), catalog)).toBe('partial');
    expect(areaLevel({ permissions: ['orders:read'] }, area('Support'), catalog)).toBe('none');
  });
});

describe('describeRole and areaNames', () => {
  it('describes the wildcard, an empty role and a mixed one', () => {
    expect(describeRole({ permissions: ['*'] })).toBe(
      'Everything, including who else is an admin and who may connect.',
    );
    expect(describeRole({ permissions: [] })).toBe('No permissions yet.');
    expect(describeRole({ permissions: ['orders:read', 'support:read', 'support:reply'] })).toBe(
      '3 permissions across Orders, Support.',
    );
    expect(describeRole({ permissions: ['dashboard:read'] })).toBe('1 permission across Dashboard.');
  });

  it('names the areas in the order the permissions list them, without repeats', () => {
    expect(areaNames({ permissions: ['support:read', 'orders:read', 'support:reply', 'mystery'] })).toEqual([
      'Support',
      'Orders',
      'Other',
    ]);
    // The wildcard covers every area, so it names none.
    expect(areaNames({ permissions: ['*'] })).toEqual([]);
  });
});

describe('sameMembers', () => {
  it('compares permission lists as sets', () => {
    expect(sameMembers(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameMembers(['a'], ['a', 'b'])).toBe(false);
    expect(sameMembers([], [])).toBe(true);
  });
});
