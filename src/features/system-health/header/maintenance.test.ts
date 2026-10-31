// Tests for the maintenance words: scope phrases, the effect sentence the dialog shows and the expected-end conversions.
import { describe, expect, it } from 'vitest';
import {
  SCOPE_OPTIONS,
  effectSentence,
  fromLocalInput,
  offSentence,
  scopePhrase,
  toLocalInput,
  whenText,
} from './maintenance';

describe('SCOPE_OPTIONS', () => {
  it('offers store, checkout, API orders and all, each with a label and what it closes', () => {
    expect(SCOPE_OPTIONS.map((option) => [option.value, option.label])).toEqual([
      ['store', 'Store'],
      ['checkout', 'Checkout'],
      ['api_orders', 'API orders'],
      ['all', 'All of them'],
    ]);
    for (const option of SCOPE_OPTIONS) expect(option.description).not.toBe('');
  });
});

describe('scopePhrase', () => {
  it('names each scope in a sentence', () => {
    expect(scopePhrase('store')).toBe('the store');
    expect(scopePhrase('checkout')).toBe('checkout');
    expect(scopePhrase('api_orders')).toBe('API orders');
    expect(scopePhrase('all')).toBe('the store, checkout and API orders');
  });

  it('is generic for no scope or one the console does not know', () => {
    expect(scopePhrase(null)).toBe('the closed part');
    // @ts-expect-error The contract is assumed: the server may add a scope.
    expect(scopePhrase('b2b')).toBe('the closed part');
  });
});

describe('effectSentence', () => {
  it('says what customers get, until when, and that the console is not affected', () => {
    expect(effectSentence('checkout')).toBe(
      'Customers using checkout get 503 MAINTENANCE with your message until you turn it off. This console is not affected.',
    );
    expect(effectSentence('all')).toContain(
      'Customers using the store, checkout and API orders get 503 MAINTENANCE',
    );
  });

  it('speaks of the part you choose before a scope is picked, whether the form says empty, null or nothing', () => {
    expect(effectSentence('')).toContain('Customers using the part you choose get 503 MAINTENANCE');
    expect(effectSentence(null)).toContain('Customers using the part you choose get 503 MAINTENANCE');
    expect(effectSentence(undefined)).toContain('Customers using the part you choose get 503 MAINTENANCE');
  });
});

describe('offSentence', () => {
  it('says who can use what again', () => {
    expect(offSentence('checkout')).toBe(
      'Customers can use checkout again, and your message stops showing. This takes effect straight away.',
    );
  });
});

describe('expected end conversions', () => {
  it('turns an ISO time into a datetime-local value in the local time zone and back', () => {
    const local = new Date(2026, 10, 2, 16, 30);
    const value = toLocalInput(local.toISOString());
    expect(value).toBe('2026-11-02T16:30');
    expect(fromLocalInput(value)).toBe(local.toISOString());
  });

  it('is empty for no time, an empty input or text that is not a time', () => {
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput('soon')).toBe('');
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('soon')).toBeNull();
  });
});

describe('whenText', () => {
  const now = new Date(2026, 7, 21, 15, 0).getTime();

  it('gives the time for today and the date with the time for another day', () => {
    expect(whenText(new Date(2026, 7, 21, 14, 2).toISOString(), now)).toBe('14:02');
    expect(whenText(new Date(2026, 7, 22, 9, 30).toISOString(), now)).toBe('22 Aug, 09:30');
  });

  it('is empty without a readable time', () => {
    expect(whenText(null, now)).toBe('');
    expect(whenText('soon', now)).toBe('');
  });
});
