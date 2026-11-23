// Tests for the plain rules of the Add-from-supplier form: which suppliers can be chosen and what the address says about one that cannot, how the
// page's kind narrows a supplier's groups, which keys the import body carries, when the shop choice is locked and on, and why Add waits.
import { describe, expect, it } from 'vitest';
import { NO_RULE_REASON, RULE_LOADING_REASON } from '../../../lib/quickAddFlow';
import { PUBLISH_SWITCHED_OFF } from '../../../lib/quickAddPublish';
import type { ServiceGroup, Supplier } from '../../../types';
import {
  addBlock,
  importBody,
  kindGroups,
  kindTypeText,
  matchesKind,
  shopIsOn,
  shopLock,
  startNotice,
  supplierBlock,
  supplierLabel,
  type AddBlockInput,
  type ShopLockInput,
} from './addRules';

const supplier = (id: number, name: string, status: Supplier['status'] = 'active') =>
  ({ id, name, status }) as Supplier;

const group = (type: string, remoteGroup: string, addable = 1): ServiceGroup => ({
  type,
  remoteGroup,
  total: addable,
  addable,
  imported: 0,
  unavailable: 0,
  unsupported: 0,
});

describe('the suppliers that can be chosen', () => {
  it('blocks only a supplier that is switched off, with the way out', () => {
    expect(supplierBlock({ status: 'active' })).toBeUndefined();
    expect(supplierBlock({ status: 'paused' })).toBeUndefined();
    expect(supplierBlock({ status: 'disabled' })).toBe(
      'Switch it on from the Suppliers page to add its services.',
    );
  });

  it('writes "switched off" after the name of a supplier that cannot be chosen', () => {
    expect(supplierLabel({ name: 'Nordic GSM', status: 'active' })).toBe('Nordic GSM');
    expect(supplierLabel({ name: 'Nordic GSM', status: 'disabled' })).toBe('Nordic GSM (switched off)');
  });

  it('says nothing for an address with no supplier or a usable one', () => {
    const list = [supplier(1, 'Nordic GSM')];
    expect(startNotice(undefined, list)).toBeUndefined();
    expect(startNotice(1, list)).toBeUndefined();
  });

  it('names a supplier that is not listed, or switched off', () => {
    expect(startNotice(9, [supplier(1, 'Nordic GSM')])).toBe(
      'That supplier is not among your connected suppliers. Pick one below.',
    );
    expect(startNotice(2, [supplier(2, 'Rapid IMEI', 'disabled')])).toBe(
      'Rapid IMEI is switched off, so its services cannot be added. Switch it on from the Suppliers page, or pick another supplier.',
    );
  });
});

describe('the kind of the page', () => {
  it('matches the supplier’s own spelling of a type, whatever its case or spaces', () => {
    expect(matchesKind('imei', 'imei')).toBe(true);
    expect(matchesKind(' IMEI ', 'imei')).toBe(true);
    expect(matchesKind('Server', 'server')).toBe(true);
    expect(matchesKind('server', 'imei')).toBe(false);
  });

  it('keeps only the groups of the kind, in the order the server gave them', () => {
    const groups = [group('imei', 'Apple'), group('server', 'Credits'), group('IMEI', 'Samsung')];
    expect(kindGroups(groups, 'imei').map((row) => row.remoteGroup)).toEqual(['Apple', 'Samsung']);
    expect(kindGroups(groups, 'file')).toEqual([]);
  });

  it('gives the exact type text for the server to narrow by only when the supplier spells the kind one way', () => {
    expect(
      kindTypeText([group('imei', 'Apple'), group('imei', 'Samsung'), group('server', 'X')], 'imei'),
    ).toBe('imei');
    expect(kindTypeText([group('imei', 'Apple'), group('IMEI', 'Samsung')], 'imei')).toBeUndefined();
    expect(kindTypeText([group('server', 'X')], 'imei')).toBeUndefined();
  });
});

describe('the body of the import', () => {
  it('leaves out the keys that ask for the server’s default', () => {
    expect(importBody([4, 5], { status: 'active', categoryId: null })).toEqual({
      supplierServiceIds: [4, 5],
    });
  });

  it('sends the status for Inactive and the group for a group of ours', () => {
    expect(importBody([4], { status: 'disabled', categoryId: null })).toEqual({
      supplierServiceIds: [4],
      status: 'disabled',
    });
    expect(importBody([4], { status: 'active', categoryId: 12 })).toEqual({
      supplierServiceIds: [4],
      categoryId: 12,
    });
    expect(importBody([4], { status: 'disabled', categoryId: 12 })).toEqual({
      supplierServiceIds: [4],
      status: 'disabled',
      categoryId: 12,
    });
  });
});

describe('the shop choice', () => {
  const usable: ShopLockInput = { way: 'groups', status: 'active', can: () => true, rule: 'active' };

  it('is open for active services, a role that may start what the way needs, and a rule that is on', () => {
    expect(shopLock(usable)).toBeUndefined();
    expect(shopLock({ ...usable, way: 'services' })).toBeUndefined();
  });

  it('gives the reason in words: Inactive first, then the permission of the way, then the rules', () => {
    const nobody = () => false;
    expect(shopLock({ ...usable, status: 'disabled', can: nobody, rule: 'none' })).toBe(PUBLISH_SWITCHED_OFF);
    expect(shopLock({ ...usable, can: nobody, rule: 'none' })).toBe(
      'You need the storefront:publish permission',
    );
    expect(shopLock({ ...usable, way: 'services', can: nobody })).toBe(
      'You need the storefront:create permission',
    );
    expect(shopLock({ ...usable, rule: 'none' })).toBe(NO_RULE_REASON);
    expect(shopLock({ ...usable, rule: 'loading' })).toBe(RULE_LOADING_REASON);
  });

  it('waits for what is still being read before it names a missing permission', () => {
    // Until the staff member's permissions are known the rules are "loading" too, and `can` says no to everything.
    expect(shopLock({ ...usable, can: () => false, rule: 'loading' })).toBe(RULE_LOADING_REASON);
  });

  it('asks for the permission each way needs and no other', () => {
    const asked: string[] = [];
    const can = (permission: string) => {
      asked.push(permission);
      return true;
    };
    shopLock({ ...usable, can });
    shopLock({ ...usable, way: 'services', can });
    expect(asked).toEqual(['storefront:publish', 'storefront:create']);
  });

  it('does not lock for a rule that cannot be read: the server checks it when the work starts', () => {
    expect(shopLock({ ...usable, rule: 'unknown' })).toBeUndefined();
  });

  it('shows Yes by default only when it can be used and a rule is known to be active; a choice wins while it can be used', () => {
    expect(shopIsOn(undefined, 'active', null)).toBe(true);
    expect(shopIsOn(undefined, 'unknown', null)).toBe(false);
    expect(shopIsOn(undefined, 'active', false)).toBe(false);
    expect(shopIsOn(undefined, 'unknown', true)).toBe(true);
    expect(shopIsOn(NO_RULE_REASON, 'none', true)).toBe(false);
  });
});

describe('why Add waits', () => {
  const ready: AddBlockInput = {
    permission: { disabled: false },
    supplierChosen: true,
    way: 'groups',
    picked: 2,
    tooMany: false,
    live: false,
    nothingToAdd: false,
    needsConfirm: false,
    confirmed: false,
  };

  it('is open when everything is in place', () => {
    expect(addBlock(ready)).toBeUndefined();
    expect(addBlock({ ...ready, way: 'services' })).toBeUndefined();
  });

  it('names the first thing that is missing, in order', () => {
    expect(
      addBlock({ ...ready, permission: { disabled: true, title: 'You need the catalog:create permission' } }),
    ).toBe('You need the catalog:create permission');
    expect(addBlock({ ...ready, supplierChosen: false, picked: 0 })).toBe('Pick a supplier first.');
    expect(addBlock({ ...ready, live: true, picked: 0 })).toBe(
      'A quick add for this supplier is already running.',
    );
    expect(addBlock({ ...ready, picked: 0 })).toBe('Pick at least one group.');
    expect(addBlock({ ...ready, way: 'services', picked: 0 })).toBe('Pick at least one service.');
    expect(addBlock({ ...ready, tooMany: true })).toBe('Pick at most 500 groups, or all of them.');
    expect(addBlock({ ...ready, way: 'services', nothingToAdd: true })).toBe(
      'Everything picked is in the console already.',
    );
    expect(addBlock({ ...ready, needsConfirm: true })).toBe('Tick the box above to confirm.');
    expect(addBlock({ ...ready, needsConfirm: true, confirmed: true })).toBeUndefined();
  });

  it('does not let a run of the supplier hold back the single services', () => {
    expect(addBlock({ ...ready, way: 'services', live: true })).toBeUndefined();
  });
});
