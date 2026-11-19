// Tests for the form of one preview row: what its fields start with, the body of the PATCH that carries only the keys staff changed
// (a price key only with `storefront:update`), the empty body, and the check of a typed price. The console works out no price.
import { describe, expect, it } from 'vitest';
import { buildPublishItems } from '../mocks/publishRows';
import type { PublishItem } from '../types';
import { checkTypedPrice, isEmptyBody, itemBody, itemValues } from './publishItemForm';

const NOW = '2026-11-18T09:00:00.000Z';
const SERVICES = new Map();
const rows = buildPublishItems(SERVICES, new Map(), NOW);
const row = (id: number): PublishItem => {
  const found = rows.find((item) => item.id === id);
  if (!found) throw new Error(`No row ${id}`);
  return found;
};

/** A row of the mock with the fields a case needs. */
const item = (patch: Partial<PublishItem> = {}): PublishItem => ({ ...row(1), ...patch });

describe('itemValues', () => {
  it('starts every field with what the row holds', () => {
    expect(itemValues(row(1))).toEqual({
      title: 'AT&T USA Premier Unlock',
      slug: 'atandt-usa-premier-unlock',
      brand: 'Apple',
      carrier: 'AT&T',
      country: 'US',
      price: 'rule',
      retailPrice: '',
    });
  });

  it('puts the typed price of a row in the field, with the shape of an input', () => {
    expect(itemValues(row(4))).toMatchObject({ price: 'manual', retailPrice: '9.99' });
  });

  it('leaves the price field empty for a row that does not hold a typed price', () => {
    expect(itemValues(row(20))).toMatchObject({ price: 'keep', retailPrice: '' });
  });
});

describe('itemBody', () => {
  it('is empty when nothing changed', () => {
    const body = itemBody(itemValues(row(1)), row(1), true);
    expect(body).toEqual({});
    expect(isEmptyBody(body)).toBe(true);
  });

  it('sends only the text keys that differ, trimmed', () => {
    const values = { ...itemValues(row(1)), title: '  AT&T Premier  ', brand: 'Apple', country: 'CA' };
    expect(itemBody(values, row(1), true)).toEqual({ title: 'AT&T Premier', country: 'CA' });
  });

  it('sends an empty address as the empty text: the server makes it from the title again', () => {
    expect(itemBody({ ...itemValues(row(1)), slug: '' }, row(1), true)).toEqual({ slug: '' });
  });

  it('sends a typed price as four-decimal text and flags the choice only when it changed', () => {
    const values = { ...itemValues(row(1)), price: 'manual' as const, retailPrice: '17.5' };
    expect(itemBody(values, row(1), true)).toEqual({ retailPrice: '17.5000' });
  });

  it('sends nothing for a typed price that is the row’s own, written another way', () => {
    const values = { ...itemValues(row(4)), retailPrice: '9.9900' };
    expect(itemBody(values, row(4), true)).toEqual({});
    expect(itemBody({ ...itemValues(row(4)), retailPrice: '10' }, row(4), true)).toEqual({
      retailPrice: '10.0000',
    });
  });

  it('sends the rule or keep choice as `pricing` when it is not the row’s own', () => {
    expect(itemBody({ ...itemValues(row(4)), price: 'rule' }, row(4), true)).toEqual({ pricing: 'rule' });
    expect(itemBody({ ...itemValues(row(3)), price: 'keep' }, row(3), true)).toEqual({ pricing: 'keep' });
  });

  it('sends no price key without the permission, and still sends the other keys', () => {
    const values = { ...itemValues(row(1)), title: 'New title', price: 'manual' as const, retailPrice: '20' };
    expect(itemBody(values, row(1), false)).toEqual({ title: 'New title' });
    expect(itemBody({ ...itemValues(row(4)), price: 'rule' }, row(4), false)).toEqual({});
  });

  it('never sends a price and a choice together', () => {
    const body = itemBody({ ...itemValues(row(1)), price: 'manual', retailPrice: '30' }, row(1), true);
    expect('pricing' in body && 'retailPrice' in body).toBe(false);
  });

  it('treats a typed price on a row that was not typed as a change, even if the number is the same', () => {
    const rule = item({ priceMode: 'rule', retailPrice: '12.9900' });
    const values = { ...itemValues(rule), price: 'manual' as const, retailPrice: '12.99' };
    expect(itemBody(values, rule, true)).toEqual({ retailPrice: '12.9900' });
  });
});

describe('checkTypedPrice', () => {
  it('asks for a price above zero only when "Type a price" is the choice', () => {
    expect(checkTypedPrice('', 'rule')).toBe(true);
    expect(checkTypedPrice('', 'keep')).toBe(true);
    expect(checkTypedPrice('', 'manual')).toBe('Enter a price greater than zero.');
    expect(checkTypedPrice('0', 'manual')).toBe('Enter a price greater than zero.');
    expect(checkTypedPrice('abc', 'manual')).toBe('Enter a price greater than zero.');
    expect(checkTypedPrice('1.23456', 'manual')).toBe('Enter a price greater than zero.');
    expect(checkTypedPrice('12.5', 'manual')).toBe(true);
    expect(checkTypedPrice(' 0.0125 ', 'manual')).toBe(true);
  });
});
