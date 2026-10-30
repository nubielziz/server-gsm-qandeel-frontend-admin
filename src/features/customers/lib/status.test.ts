// Tests for the words of a customer's status and risk, the dialogs' reasons, the countries and the detail tabs' addresses.
import { describe, expect, it } from 'vitest';
import { COUNTRIES, countryName, countryOptions } from './countries';
import { customerPath, DETAIL_TABS, isDetailTab } from './detailTabs';
import {
  BLOCK_REASONS,
  LOCALES,
  rawLabel,
  RISK_BADGE,
  riskBadge,
  STATUS_BADGE,
  statusBadge,
  SUSPEND_REASONS,
} from './status';

describe('status and risk words', () => {
  it('gives each status a word, a tone and an icon', () => {
    expect(Object.entries(STATUS_BADGE).map(([status, badge]) => [status, badge.label])).toEqual([
      ['active', 'Active'],
      ['suspended', 'Suspended'],
      ['blocked', 'Blocked'],
      ['anonymized', 'Anonymised'],
    ]);
    expect(STATUS_BADGE.blocked).toMatchObject({ tone: 'crit', icon: 'ban' });
    expect(STATUS_BADGE.suspended).toMatchObject({ tone: 'warn', icon: 'pause' });
  });

  it('says "Medium" for the API’s `medium` (the demo said `med`)', () => {
    expect(RISK_BADGE.medium.label).toBe('Medium');
    expect(RISK_BADGE.high.tone).toBe('crit');
  });

  it('gives a status or level it does not know a neutral look with its raw value, and the known ones their own', () => {
    expect(statusBadge('blocked')).toBe(STATUS_BADGE.blocked);
    expect(statusBadge('pending_review')).toEqual({ label: 'pending_review', tone: 'neutral', icon: 'info' });
    expect(riskBadge('high')).toBe(RISK_BADGE.high);
    expect(riskBadge('med')).toEqual({ label: 'med', tone: 'neutral' });
    // Names on the prototype chain are not statuses.
    expect(statusBadge('constructor')).toMatchObject({ label: 'constructor', tone: 'neutral' });
  });

  it('reads an empty or missing value as "Unknown"', () => {
    expect(rawLabel('med')).toBe('med');
    expect(rawLabel('')).toBe('Unknown');
    expect(rawLabel('   ')).toBe('Unknown');
    expect(rawLabel(undefined)).toBe('Unknown');
    expect(rawLabel(null)).toBe('Unknown');
  });

  it('offers the demo’s reasons and both languages', () => {
    expect(SUSPEND_REASONS).toHaveLength(5);
    expect(SUSPEND_REASONS[0]).toBe('Customer asked to pause the account');
    expect(BLOCK_REASONS).toEqual([
      'Chargeback or dispute',
      'Card testing or fraud',
      'Abuse of refunds',
      'Other',
    ]);
    expect(LOCALES.map((locale) => locale.value)).toEqual(['en', 'ar']);
  });
});

describe('countries', () => {
  it('names the twelve storefront countries and falls back to the code', () => {
    expect(COUNTRIES).toHaveLength(12);
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('PL')).toBe('PL');
  });

  it('keeps a country the list does not know selectable, first', () => {
    expect(countryOptions().map((option) => option.value)).toEqual(COUNTRIES.map((country) => country.code));
    expect(countryOptions('GB')).toHaveLength(12);
    expect(countryOptions('PL')[0]).toEqual({ value: 'PL', label: 'PL' });
    expect(countryOptions('PL')).toHaveLength(13);
  });
});

describe('detail tabs', () => {
  it('lists the five tabs of the demo', () => {
    expect(DETAIL_TABS.map((tab) => tab.label)).toEqual([
      'Orders',
      'Account',
      'Support',
      'Consents and data',
      'Risk',
    ]);
    expect(isDetailTab('risk')).toBe(true);
    expect(isDetailTab('billing')).toBe(false);
    expect(isDetailTab(null)).toBe(false);
  });

  it('builds the address of a customer and its tabs; the default tab needs no parameter', () => {
    expect(customerPath(7)).toBe('/customers/7');
    expect(customerPath(7, 'orders')).toBe('/customers/7');
    expect(customerPath(7, 'account')).toBe('/customers/7?tab=account');
    expect(customerPath(7, 'consents')).toBe('/customers/7?tab=consents');
  });
});
