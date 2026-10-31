// Tests for the maintenance words: scope phrases, the effect sentence the dialog shows and the expected-end conversions.
import { describe, expect, it } from 'vitest';
import { SCOPE_OPTIONS, effectSentence, offSentence, scopePhrase } from './maintenance';

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
