// Tests for the record types: names on screen, the server's other spellings, and the text for a record.
import { describe, expect, it } from 'vitest';
import { ENTITY_KINDS, entityKind, entityTypeLabel, recordText } from './entities';

describe('entityKind', () => {
  it('keeps the console’s own names', () => {
    expect(entityKind('order')).toBe('order');
    expect(entityKind('ip_rule')).toBe('ip_rule');
  });

  it('reads table names and plurals as the same record type', () => {
    expect(entityKind('orders')).toBe('order');
    expect(entityKind('clients')).toBe('merchant');
    expect(entityKind('staff_users')).toBe('staff');
    expect(entityKind('support_tickets')).toBe('ticket');
    expect(entityKind('Legal Documents')).toBe('legal');
    expect(entityKind('ip-rules')).toBe('ip_rule');
  });

  it('gives an unknown type back in lower case', () => {
    expect(entityKind('Webhook-Endpoint')).toBe('webhook_endpoint');
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
    expect(entityTypeLabel('webhook_endpoint')).toBe('Webhook endpoint');
  });

  it('has a word for every type the filter offers', () => {
    expect(ENTITY_KINDS).toHaveLength(19);
    for (const kind of ENTITY_KINDS) expect(entityTypeLabel(kind)).not.toBe('');
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
