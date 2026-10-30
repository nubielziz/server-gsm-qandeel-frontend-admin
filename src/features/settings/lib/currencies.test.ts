// Tests for the currency helpers: the base currency, stale rates (the server's flag or the 24-hour rule) and the form checks.
import { describe, expect, it } from 'vitest';
import type { Currency } from '../types';
import {
  isBaseCurrency,
  isStaleRate,
  markupProblem,
  oldestUpdate,
  rateProblem,
  shownAs,
  staleCurrencies,
} from './currencies';

const NOW = Date.parse('2026-06-10T12:00:00.000Z');
const HOUR = 3_600_000;

const currency = (patch: Partial<Currency>): Currency => ({
  id: 2,
  code: 'GBP',
  name: 'Pound sterling',
  rateToBase: '0.7900',
  rateUpdatedAt: new Date(NOW - 2 * HOUR).toISOString(),
  markupPercent: '1.5000',
  charmRounding: true,
  isStorefront: true,
  decimals: 2,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

describe('isStaleRate', () => {
  it('is stale after 24 hours, or when never updated', () => {
    expect(isStaleRate(currency({}), NOW)).toBe(false);
    expect(isStaleRate(currency({ rateUpdatedAt: new Date(NOW - 25 * HOUR).toISOString() }), NOW)).toBe(true);
    expect(isStaleRate(currency({ rateUpdatedAt: null }), NOW)).toBe(true);
  });

  it('follows the server’s own flag when it sends one', () => {
    expect(isStaleRate(currency({ isStale: true }), NOW)).toBe(true);
    expect(
      isStaleRate(currency({ isStale: false, rateUpdatedAt: new Date(NOW - 99 * HOUR).toISOString() }), NOW),
    ).toBe(false);
  });

  it('never ages the base currency', () => {
    const usd = currency({ code: 'USD', rateUpdatedAt: null });
    expect(isBaseCurrency(usd)).toBe(true);
    expect(isStaleRate(usd, NOW)).toBe(false);
  });
});

describe('staleCurrencies and oldestUpdate', () => {
  const old = currency({ id: 3, code: 'SEK', rateUpdatedAt: new Date(NOW - 74 * HOUR).toISOString() });
  it('lists the stale ones and finds the oldest time', () => {
    expect(staleCurrencies([currency({}), old], NOW).map((row) => row.code)).toEqual(['SEK']);
    expect(oldestUpdate([old, currency({})], NOW)).toBe(NOW - 74 * HOUR);
    expect(oldestUpdate([], NOW)).toBe(NOW);
  });
});

describe('shownAs and the form checks', () => {
  it('prints the symbol customers see', () => {
    expect(shownAs('GBP')).toBe('£');
    expect(shownAs('SEK')).toBe('kr');
    expect(shownAs('CHF')).toBe('CHF');
  });

  it('keeps the demo’s 0 to 10 markup range as a hint', () => {
    expect(markupProblem('1.5')).toBeNull();
    expect(markupProblem('10')).toBeNull();
    expect(markupProblem('11')).toBe('Enter a markup between 0 and 10.');
    expect(markupProblem('abc')).toBe('Enter a markup between 0 and 10.');
  });

  it('wants a rate above zero', () => {
    expect(rateProblem('0.79')).toBeNull();
    expect(rateProblem('0')).toBe('Enter a rate above zero.');
    expect(rateProblem('')).toBe('Enter a rate above zero.');
  });
});
