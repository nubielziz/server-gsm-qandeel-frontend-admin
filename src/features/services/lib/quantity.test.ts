// Tests for the quantity block of the service dialog: which way a service sells, the packs typed by hand, the messages, and the body
// for a new service and for an edit.
import { describe, expect, it } from 'vitest';
import {
  maxProblem,
  minProblem,
  modeOf,
  packsProblem,
  parsePacks,
  quantityBody,
  quantityDefaults,
  ruleOf,
  type QuantityValues,
} from './quantity';

const values = (changes: Partial<QuantityValues>): QuantityValues => ({
  quantityMode: 'single',
  minQty: '1',
  maxQty: '',
  qtyOptions: '',
  ...changes,
});

describe('modeOf', () => {
  it('reads packs, one per order and a range', () => {
    expect(modeOf({ minQty: 1, maxQty: 1, qtyOptions: [] })).toBe('single');
    expect(modeOf({ minQty: 1, maxQty: 50, qtyOptions: [] })).toBe('range');
    expect(modeOf({ minQty: 5, maxQty: 5, qtyOptions: [] })).toBe('range');
    expect(modeOf({ minQty: 5, maxQty: 25, qtyOptions: [5, 10, 25] })).toBe('packs');
  });
});

describe('quantityDefaults', () => {
  it('starts a new service at one per order with the largest empty', () => {
    expect(quantityDefaults()).toEqual({ quantityMode: 'single', minQty: '1', maxQty: '', qtyOptions: '' });
  });

  it('starts an edit in the way the service sells', () => {
    expect(quantityDefaults({ minQty: 2, maxQty: 9, qtyOptions: [] })).toMatchObject({
      quantityMode: 'range',
      minQty: '2',
      maxQty: '9',
    });
    expect(quantityDefaults({ minQty: 5, maxQty: 25, qtyOptions: [5, 10, 25] })).toMatchObject({
      quantityMode: 'packs',
      qtyOptions: '5, 10, 25',
    });
    expect(quantityDefaults({ minQty: 1, maxQty: 1, qtyOptions: [] }).quantityMode).toBe('single');
  });
});

describe('parsePacks', () => {
  it('sorts the sizes and accepts commas, semicolons and spaces', () => {
    expect(parsePacks('25, 5;10 100')).toEqual({ packs: [5, 10, 25, 100] });
  });

  it('asks for at least one', () => {
    expect(parsePacks(' , ')).toEqual({ message: 'Enter at least one pack size.' });
  });

  it('names the first token that is not a whole number from 1 to 100000', () => {
    const message = (token: string) => `Pack sizes are whole numbers from 1 to 100000; ${token} is not.`;
    expect(parsePacks('5, ten')).toEqual({ message: message('ten') });
    expect(parsePacks('5, 0')).toEqual({ message: message('0') });
    expect(parsePacks('2.5')).toEqual({ message: message('2.5') });
    expect(parsePacks('100001')).toEqual({ message: message('100001') });
  });

  it('names the first repeat', () => {
    expect(parsePacks('5, 10, 5')).toEqual({ message: 'The pack size 5 is repeated.' });
  });

  it('refuses more than 50', () => {
    const many = Array.from({ length: 51 }, (_, index) => index + 1).join(',');
    expect(parsePacks(many)).toEqual({ message: 'Use at most 50 pack sizes.' });
    expect('packs' in parsePacks(many.replace(',51', ''))).toBe(true);
  });
});

describe('the field messages', () => {
  it('check only the way that is chosen', () => {
    expect(minProblem(values({ quantityMode: 'single', minQty: 'x' }))).toBe(true);
    expect(maxProblem(values({ quantityMode: 'packs' }))).toBe(true);
    expect(packsProblem(values({ quantityMode: 'range' }))).toBe(true);
  });

  it('say what is wrong with the range', () => {
    const range = (minQty: string, maxQty: string) => values({ quantityMode: 'range', minQty, maxQty });
    const whole = 'Enter a whole number from 1 to 100000.';
    expect(minProblem(range('0', '5'))).toBe(whole);
    expect(minProblem(range('', '5'))).toBe(whole);
    expect(maxProblem(range('1', ''))).toBe(whole);
    expect(maxProblem(range('1', '100001'))).toBe(whole);
    expect(maxProblem(range('5', '3'))).toBe('The largest quantity cannot be below the smallest (5).');
    expect(maxProblem(range('5', '5'))).toBe(true);
  });

  it('say what is wrong with the packs', () => {
    expect(packsProblem(values({ quantityMode: 'packs', qtyOptions: '' }))).toBe(
      'Enter at least one pack size.',
    );
    expect(packsProblem(values({ quantityMode: 'packs', qtyOptions: '5, 10' }))).toBe(true);
  });
});

describe('ruleOf', () => {
  it('works out the rule the inputs mean, deriving the smallest and largest pack', () => {
    expect(ruleOf(values({ quantityMode: 'single' }))).toEqual({ minQty: 1, maxQty: 1, qtyOptions: [] });
    expect(ruleOf(values({ quantityMode: 'range', minQty: '2', maxQty: '8' }))).toEqual({
      minQty: 2,
      maxQty: 8,
      qtyOptions: [],
    });
    expect(ruleOf(values({ quantityMode: 'packs', qtyOptions: '25, 5' }))).toEqual({
      minQty: 5,
      maxQty: 25,
      qtyOptions: [5, 25],
    });
  });

  it('is null while an input has a problem', () => {
    expect(ruleOf(values({ quantityMode: 'range', minQty: '5', maxQty: '2' }))).toBeNull();
    expect(ruleOf(values({ quantityMode: 'packs', qtyOptions: 'a' }))).toBeNull();
  });
});

describe('quantityBody for a new service', () => {
  it('sends nothing for one per order', () => {
    expect(quantityBody(values({ quantityMode: 'single' }))).toEqual({});
  });

  it('sends the range', () => {
    expect(quantityBody(values({ quantityMode: 'range', minQty: '1', maxQty: '50' }))).toEqual({
      minQty: 1,
      maxQty: 50,
    });
  });

  it('sends the packs sorted and nothing else', () => {
    expect(quantityBody(values({ quantityMode: 'packs', qtyOptions: '25, 5, 10' }))).toEqual({
      qtyOptions: [5, 10, 25],
    });
  });
});

describe('quantityBody for an edit', () => {
  const one = { minQty: 1, maxQty: 1, qtyOptions: [] };
  const packs = { minQty: 5, maxQty: 25, qtyOptions: [5, 10, 25] };

  it('sends nothing when the rule is the service’s own', () => {
    expect(quantityBody(values({ quantityMode: 'single' }), one)).toEqual({});
    expect(quantityBody(values({ quantityMode: 'packs', qtyOptions: '25, 10, 5' }), packs)).toEqual({});
    expect(
      quantityBody(values({ quantityMode: 'range', minQty: '1', maxQty: '9' }), {
        minQty: 1,
        maxQty: 9,
        qtyOptions: [],
      }),
    ).toEqual({});
  });

  it('clears the packs and sets the range when the range changes', () => {
    expect(quantityBody(values({ quantityMode: 'range', minQty: '1', maxQty: '50' }), packs)).toEqual({
      minQty: 1,
      maxQty: 50,
      qtyOptions: [],
    });
  });

  it('goes back to one per order with all three keys', () => {
    expect(quantityBody(values({ quantityMode: 'single' }), packs)).toEqual({
      minQty: 1,
      maxQty: 1,
      qtyOptions: [],
    });
  });

  it('sends the packs alone, because the server derives the smallest and largest', () => {
    expect(quantityBody(values({ quantityMode: 'packs', qtyOptions: '10, 5' }), one)).toEqual({
      qtyOptions: [5, 10],
    });
  });
});
