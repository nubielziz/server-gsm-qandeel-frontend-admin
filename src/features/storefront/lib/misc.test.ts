// Tests for the small helpers: money text for the price form, the names box of the generator, the TAC checks, the storefront
// link from the Vite env and the addresses other pages link to.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { namesOf } from './names';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from './money';
import { storefrontListPath } from './paths';
import { isTacPrefix, isYear } from './tac';
import { storefrontUrl } from './url';

afterEach(() => vi.unstubAllEnvs());

describe('money text', () => {
  it('shows an API amount with two decimals and no trailing zeros beyond them', () => {
    expect(moneyInput('3.9900')).toBe('3.99');
    expect(moneyInput('0.1250')).toBe('0.125');
    expect(moneyInput('12')).toBe('12.00');
  });

  it('sends a typed amount as four-decimal text and compares two spellings of one amount', () => {
    expect(toMoneyText('4.5')).toBe('4.5000');
    expect(sameMoney('3.99', '3.9900')).toBe(true);
    expect(sameMoney('3.99', '4')).toBe(false);
    expect(isMoneyText('12.5')).toBe(true);
    expect(isMoneyText('12.12345')).toBe(false);
    expect(isMoneyText('-1')).toBe(false);
  });
});

describe('namesOf', () => {
  it('splits on commas and new lines, trims and drops empty items', () => {
    expect(namesOf('Apple, Samsung\n\n  Google ,')).toEqual(['Apple', 'Samsung', 'Google']);
    expect(namesOf('  ')).toEqual([]);
  });
});

describe('TAC checks', () => {
  it('wants 8 digits and a 4-digit year', () => {
    expect(isTacPrefix('35389011')).toBe(true);
    expect(isTacPrefix('3538901')).toBe(false);
    expect(isTacPrefix('3538901a')).toBe(false);
    expect(isYear('2021')).toBe(true);
    expect(isYear('21')).toBe(false);
  });
});

describe('storefrontUrl', () => {
  it('is undefined without the env variable and drops a trailing slash with it', () => {
    vi.stubEnv('VITE_STOREFRONT_URL', '');
    expect(storefrontUrl()).toBeUndefined();
    vi.stubEnv('VITE_STOREFRONT_URL', ' https://shop.example.com/ ');
    expect(storefrontUrl()).toBe('https://shop.example.com');
  });
});

describe('storefrontListPath', () => {
  it('leaves defaults out and writes the tab, kind and search', () => {
    expect(storefrontListPath()).toBe('/storefront');
    expect(storefrontListPath({ tab: 'listings' })).toBe('/storefront');
    expect(storefrontListPath({ tab: 'landing', kind: 'carrier' })).toBe(
      '/storefront?tab=landing&kind=carrier',
    );
    expect(storefrontListPath({ tab: 'tac', q: '3538' })).toBe('/storefront?tab=tac&q=3538');
  });
});
