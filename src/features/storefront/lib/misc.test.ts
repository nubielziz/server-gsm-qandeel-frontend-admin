// Tests for the small helpers: money text for the price form, the storefront link from the Vite env and the addresses other pages
// link to.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from './money';
import {
  storefrontListPath,
  storefrontOnShopPath,
  storefrontPricingPath,
  storefrontPublishPath,
} from './paths';
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

describe('storefrontUrl', () => {
  it('is undefined without the env variable and drops a trailing slash with it', () => {
    vi.stubEnv('VITE_STOREFRONT_URL', '');
    expect(storefrontUrl()).toBeUndefined();
    vi.stubEnv('VITE_STOREFRONT_URL', ' https://shop.example.com/ ');
    expect(storefrontUrl()).toBe('https://shop.example.com');
  });
});

describe('storefrontListPath', () => {
  it('is the bare page with no state, and writes the tab and the search otherwise', () => {
    expect(storefrontListPath()).toBe('/storefront');
    expect(storefrontListPath({ tab: 'content' })).toBe('/storefront?tab=content');
    expect(storefrontListPath({ tab: 'help', q: 'refund' })).toBe('/storefront?tab=help&q=refund');
  });

  it('names the default tab explicitly when a search comes without a tab', () => {
    expect(storefrontListPath({ q: 'refund' })).toBe('/storefront?tab=content&q=refund');
  });
});

describe('the Product / Services addresses', () => {
  it('names the Shop Publish view, and a run in it', () => {
    expect(storefrontPublishPath()).toBe('/products?view=publish');
    expect(storefrontPublishPath(12)).toBe('/products?view=publish&run=12');
  });

  it('names the shop price rules of the Price Rules view, and their All view', () => {
    expect(storefrontPricingPath()).toBe('/products?view=rules&tab=shop');
    expect(storefrontPricingPath({ show: 'all' })).toBe('/products?view=rules&tab=shop&show=all');
  });

  it('names the list of services, where a finished run points to', () => {
    expect(storefrontOnShopPath()).toBe('/products?view=all');
  });
});
