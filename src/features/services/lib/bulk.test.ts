// Tests for the bulk price change dialog's form: the request body built from it, the first mistake it names, and the words for the change.
import { describe, expect, it } from 'vitest';
import { buildBulkBody, describeChange, servicesText, type BulkValues } from './bulk';

const values = (overrides: Partial<BulkValues> = {}): BulkValues => ({
  scope: 'category',
  categoryId: '6',
  direction: 'raise',
  type: 'percent',
  amount: '5',
  ...overrides,
});

describe('buildBulkBody', () => {
  it('builds a category body, raising by the amount as typed', () => {
    expect(buildBulkBody(values(), [])).toEqual({
      body: { categoryId: 6, change: { type: 'percent', value: '5' } },
    });
    expect(buildBulkBody(values({ type: 'fixed', amount: ' 0.50 ' }), [])).toEqual({
      body: { categoryId: 6, change: { type: 'fixed', value: '0.50' } },
    });
  });

  it('puts a minus sign in front for a cut, without doing any maths', () => {
    expect(buildBulkBody(values({ direction: 'lower', amount: '2.5' }), [])).toEqual({
      body: { categoryId: 6, change: { type: 'percent', value: '-2.5' } },
    });
  });

  it('builds a body for the ticked services', () => {
    expect(buildBulkBody(values({ scope: 'selected', categoryId: '' }), [3, 9])).toEqual({
      body: { serviceIds: [3, 9], change: { type: 'percent', value: '5' } },
    });
  });

  it('names the first mistake and the field it belongs to', () => {
    expect(buildBulkBody(values({ amount: '' }), [])).toEqual({
      error: 'Enter an amount greater than zero.',
      field: 'amount',
    });
    expect(buildBulkBody(values({ amount: '0' }), [])).toMatchObject({ field: 'amount' });
    expect(buildBulkBody(values({ amount: '-5' }), [])).toMatchObject({ field: 'amount' });
    expect(buildBulkBody(values({ categoryId: '' }), [])).toEqual({
      error: 'Choose a category.',
      field: 'categoryId',
    });
    expect(buildBulkBody(values({ scope: 'selected' }), [])).toEqual({
      error: 'Tick at least one service first.',
      field: 'scope',
    });
  });
});

describe('words', () => {
  it('describes the change', () => {
    expect(describeChange({ type: 'percent', value: '5' })).toBe('Raise prices by 5%');
    expect(describeChange({ type: 'percent', value: '-2.50' })).toBe('Lower prices by 2.5%');
    expect(describeChange({ type: 'fixed', value: '0.5' })).toBe('Raise prices by $0.50');
    expect(describeChange({ type: 'fixed', value: '-1' })).toBe('Lower prices by $1.00');
  });

  it('counts services', () => {
    expect(servicesText(1)).toBe('1 service');
    expect(servicesText(3)).toBe('3 services');
  });
});
