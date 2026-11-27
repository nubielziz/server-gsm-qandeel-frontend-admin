// Tests for the tax table texts, the date helpers and the "in force" check.
import { describe, expect, it } from 'vitest';
import type { TaxRate } from '../types';
import {
  countryName,
  DEFAULT_APPLIES_TO,
  hasCustomTaxFacts,
  todayInput,
  effectiveDay,
  fromDateInput,
  rateText,
  rateWindow,
  schemeText,
  sortTaxRates,
  taxTypeLabel,
  toDateInput,
} from './tax';

const rate = (patch: Partial<TaxRate>): TaxRate => ({
  id: 1,
  country: 'GB',
  region: '',
  ratePercent: '20.0000',
  taxType: 'vat',
  appliesTo: 'digital_services',
  validFrom: '2026-01-01T00:00:00.000Z',
  validTo: null,
  label: '',
  ossScheme: 'UK VAT',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

describe('texts', () => {
  it('names a known country and keeps an unknown code', () => {
    expect(countryName('gb')).toBe('United Kingdom');
    expect(countryName('JP')).toBe('Japan');
    expect(countryName('ZZ')).toBe('ZZ');
  });

  it('writes the rate with its kind, or No tax', () => {
    expect(rateText(rate({}))).toBe('20% VAT');
    expect(rateText(rate({ ratePercent: '7.5000', taxType: 'gst' }))).toBe('7.5% GST');
    expect(rateText(rate({ ratePercent: '0.0000', taxType: 'none' }))).toBe('No tax');
    expect(taxTypeLabel('odd')).toBe('odd');
  });

  it('says Not collected when there is no scheme', () => {
    expect(schemeText(rate({ ossScheme: '' }))).toBe('Not collected');
    expect(schemeText(rate({}))).toBe('UK VAT');
  });
});

describe('dates', () => {
  it('shows a calendar date in UTC and converts to and from a date input', () => {
    expect(effectiveDay('2026-03-05T00:00:00.000Z')).toBe('05 Mar 2026');
    expect(effectiveDay(null)).toBe('');
    expect(toDateInput('2026-03-05T00:00:00.000Z')).toBe('2026-03-05');
    expect(fromDateInput('2026-03-05')).toBe('2026-03-05T00:00:00.000Z');
    expect(fromDateInput('')).toBeNull();
    expect(fromDateInput('05/03/2026')).toBeNull();
  });

  it('tells a scheduled, current and ended rate apart', () => {
    const now = Date.parse('2026-06-01T00:00:00.000Z');
    expect(rateWindow(rate({ validFrom: '2026-07-01T00:00:00.000Z' }), now)).toBe('scheduled');
    expect(rateWindow(rate({}), now)).toBe('current');
    expect(rateWindow(rate({ validTo: '2026-05-01T00:00:00.000Z' }), now)).toBe('ended');
  });
});

describe('sortTaxRates', () => {
  it('orders by country name, newest start first within a country', () => {
    const rows = [
      rate({ id: 1, country: 'GB', validFrom: '2025-01-01T00:00:00.000Z' }),
      rate({ id: 2, country: 'DE' }),
      rate({ id: 3, country: 'GB', validFrom: '2026-01-01T00:00:00.000Z' }),
    ];
    expect(sortTaxRates(rows).map((row) => row.id)).toEqual([2, 3, 1]);
  });
});

describe('the new-rate defaults', () => {
  it('writes today as the UTC calendar day of a date input', () => {
    expect(todayInput(Date.parse('2026-11-27T23:59:00.000Z'))).toBe('2026-11-27');
    expect(todayInput(Date.parse('2026-11-28T00:00:00.000Z'))).toBe('2026-11-28');
    expect(todayInput()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('says a saved rate holds a value of its own in the fold, and a plain one does not', () => {
    const plain = { region: '', validTo: null, ossScheme: '', appliesTo: DEFAULT_APPLIES_TO, label: '' };
    expect(hasCustomTaxFacts(plain)).toBe(false);
    expect(hasCustomTaxFacts({ ...plain, region: 'Bavaria' })).toBe(true);
    expect(hasCustomTaxFacts({ ...plain, validTo: '2026-12-31T00:00:00.000Z' })).toBe(true);
    expect(hasCustomTaxFacts({ ...plain, ossScheme: 'EU OSS' })).toBe(true);
    expect(hasCustomTaxFacts({ ...plain, appliesTo: 'goods' })).toBe(true);
    expect(hasCustomTaxFacts({ ...plain, label: 'VAT' })).toBe(true);
  });
});
