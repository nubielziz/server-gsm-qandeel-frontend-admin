// Tests for the plain rules of step 1 of the Add services flow: which suppliers can be chosen, the line for an opening address that names
// one that cannot, and the lock a control with several permissions shows.
import { describe, expect, it } from 'vitest';
import type { Supplier } from '../../types';
import { firstLock, startNotice, supplierBlock, WAYS } from './addFlowChoice';

/** The few fields these rules read; the rest of a supplier is not needed here. */
const supplier = (id: number, name: string, status: Supplier['status']) => ({ id, name, status }) as Supplier;

const NORDIC = supplier(1, 'Nordic GSM', 'active');
const PAUSED = supplier(2, 'Gulf Server Hub', 'paused');
const OFF = supplier(3, 'Rapid IMEI', 'disabled');

describe('supplierBlock', () => {
  it('lets an active supplier and a paused one be chosen', () => {
    expect(supplierBlock(NORDIC)).toBeUndefined();
    expect(supplierBlock(PAUSED)).toBeUndefined();
  });

  it('says what to do about a disabled supplier', () => {
    expect(supplierBlock(OFF)).toBe('Switch it on from the Suppliers page to add its services.');
  });
});

describe('startNotice', () => {
  const list = [NORDIC, PAUSED, OFF];

  it('says nothing when the address named no supplier, or one that can start the flow', () => {
    expect(startNotice(undefined, list)).toBeUndefined();
    expect(startNotice(1, list)).toBeUndefined();
    expect(startNotice(2, list)).toBeUndefined();
  });

  it('says why a supplier that is not in the list cannot start it', () => {
    expect(startNotice(99, list)).toBe(
      'That supplier is not among your connected suppliers. Pick one below.',
    );
  });

  it('names a disabled supplier and what to do', () => {
    expect(startNotice(3, list)).toBe(
      'Rapid IMEI is disabled, so its services cannot be added. Switch it on from the Suppliers page, or pick another supplier.',
    );
  });
});

describe('firstLock', () => {
  const open = { disabled: false };
  const read = { disabled: true, title: 'You need the suppliers:read permission' };
  const create = { disabled: true, title: 'You need the catalog:create permission' };

  it('is open when nothing is locked', () => {
    expect(firstLock(open, open)).toEqual({ disabled: false });
    expect(firstLock()).toEqual({ disabled: false });
  });

  it('names the first permission that is missing', () => {
    expect(firstLock(read, create)).toBe(read);
    expect(firstLock(open, create)).toBe(create);
  });
});

describe('the two ways in', () => {
  it('are whole groups first, then single services', () => {
    expect(WAYS.map((way) => [way.id, way.label])).toEqual([
      ['groups', 'Whole groups'],
      ['services', 'Single services'],
    ]);
  });
});
