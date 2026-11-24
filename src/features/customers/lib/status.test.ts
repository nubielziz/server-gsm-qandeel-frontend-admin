// Tests for the words of a customer's status, the dialogs' reasons, the countries and the detail tabs' addresses.
import { describe, expect, it } from 'vitest';
import { COUNTRIES, countryName, countryOptions } from './countries';
import { customerPath, DETAIL_TABS, isDetailTab, visibleDetailTabs } from './detailTabs';
import { BLOCK_REASONS, rawLabel, STATUS_BADGE, statusBadge, SUSPEND_REASONS } from './status';

describe('status words', () => {
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

  it('gives a status it does not know a neutral look with its raw value, and the known ones their own', () => {
    expect(statusBadge('blocked')).toBe(STATUS_BADGE.blocked);
    expect(statusBadge('pending_review')).toEqual({ label: 'pending_review', tone: 'neutral', icon: 'info' });
    // Names on the prototype chain are not statuses.
    expect(statusBadge('constructor')).toMatchObject({ label: 'constructor', tone: 'neutral' });
  });

  it('reads an empty or missing value as "Unknown"', () => {
    expect(rawLabel('pending_review')).toBe('pending_review');
    expect(rawLabel('')).toBe('Unknown');
    expect(rawLabel('   ')).toBe('Unknown');
    expect(rawLabel(undefined)).toBe('Unknown');
    expect(rawLabel(null)).toBe('Unknown');
  });

  it('offers the demo’s reasons', () => {
    expect(SUSPEND_REASONS).toHaveLength(5);
    expect(SUSPEND_REASONS[0]).toBe('Customer asked to pause the account');
    expect(BLOCK_REASONS).toEqual([
      'Chargeback or dispute',
      'Card testing or fraud',
      'Abuse of refunds',
      'Other',
    ]);
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
  it('lists the five tabs of the demo and the Wallet tab after Account', () => {
    expect(DETAIL_TABS.map((tab) => tab.label)).toEqual([
      'Orders',
      'Account',
      'Wallet',
      'Support',
      'Consents and data',
      'Risk',
    ]);
    expect(isDetailTab('risk')).toBe(true);
    expect(isDetailTab('billing')).toBe(false);
    expect(isDetailTab(null)).toBe(false);
  });

  it('leaves the Wallet tab out without wallet:read', () => {
    expect(visibleDetailTabs(() => false).map((tab) => tab.id)).not.toContain('wallet');
    expect(visibleDetailTabs((permission) => permission === 'wallet:read').map((tab) => tab.id)).toContain(
      'wallet',
    );
    expect(visibleDetailTabs(() => true)).toHaveLength(DETAIL_TABS.length);
  });

  it('builds the address of a customer and its tabs; the default tab needs no parameter', () => {
    expect(customerPath(7)).toBe('/customers/7');
    expect(customerPath(7, 'orders')).toBe('/customers/7');
    expect(customerPath(7, 'account')).toBe('/customers/7?tab=account');
    expect(customerPath(7, 'consents')).toBe('/customers/7?tab=consents');
  });
});
