// Tests for the record types: names on screen, the server's other spellings, and the text for a record.
import { describe, expect, it } from 'vitest';
import { ENTITY_KINDS, entityKind, entityTypeLabel, isOldCustomerWord, recordText } from './entities';

describe('entityKind', () => {
  it('keeps the console’s own names', () => {
    expect(entityKind('order')).toBe('order');
    expect(entityKind('ip_rule')).toBe('ip_rule');
  });

  it('reads table names and plurals as the same record type', () => {
    expect(entityKind('orders')).toBe('order');
    expect(entityKind('staff_users')).toBe('staff');
    expect(entityKind('support_tickets')).toBe('ticket');
    expect(entityKind('Legal Documents')).toBe('legal');
    expect(entityKind('ip-rules')).toBe('ip_rule');
  });

  it('reads every word of an account as the one record type "account"', () => {
    for (const word of [
      'account',
      'accounts',
      'merchant',
      'merchants',
      'client',
      'clients',
      'customer',
      'Customers',
    ]) {
      expect(entityKind(word)).toBe('account');
      expect(entityTypeLabel(word)).toBe('Account');
    }
  });

  it('knows the old customer word, whose number is not an account number', () => {
    expect(isOldCustomerWord('customer')).toBe(true);
    expect(isOldCustomerWord(' Customers ')).toBe(true);
    for (const word of ['account', 'merchant', 'client', 'order'])
      expect(isOldCustomerWord(word)).toBe(false);
  });

  it('gives an unknown type back in lower case', () => {
    expect(entityKind('Export-Job')).toBe('export_job');
  });
});

describe('entityTypeLabel', () => {
  it('uses the demo’s words', () => {
    expect(entityTypeLabel('payment')).toBe('Deposit');
    expect(entityTypeLabel('staff')).toBe('Admin');
    expect(entityTypeLabel('listing')).toBe('Storefront');
    expect(entityTypeLabel('legal')).toBe('Legal document');
  });

  it('writes a type it has no word for as a sentence start', () => {
    expect(entityTypeLabel('export_job')).toBe('Export job');
  });

  it('has a word for every type the filter offers', () => {
    expect(ENTITY_KINDS).toHaveLength(17);
    for (const kind of ENTITY_KINDS) expect(entityTypeLabel(kind)).not.toBe('');
  });

  it('offers one filter for accounts and none for the old words', () => {
    expect(ENTITY_KINDS).toContain('account');
    expect(ENTITY_KINDS).not.toContain('merchant');
    expect(ENTITY_KINDS).not.toContain('customer');
  });

  it('offers no filter for the retired commission plan, and still names an old row of that type', () => {
    expect(ENTITY_KINDS).not.toContain('plan');
    expect(entityKind('plans')).toBe('plans');
    expect(entityTypeLabel('plan')).toBe('Plan');
    expect(recordText({ entityType: 'plan', entityId: 3, entityLabel: null })).toBe('Plan #3');
  });
});

describe('recordText', () => {
  it('shows the name the server saved', () => {
    expect(recordText({ entityType: 'order', entityId: 7, entityLabel: ' ORD-7 for Zain ' })).toBe(
      'ORD-7 for Zain',
    );
  });

  it('falls back to the type and the number', () => {
    expect(recordText({ entityType: 'orders', entityId: 4812, entityLabel: null })).toBe('Order #4812');
    expect(recordText({ entityType: 'setting', entityId: 0, entityLabel: '' })).toBe('Setting');
  });
});
