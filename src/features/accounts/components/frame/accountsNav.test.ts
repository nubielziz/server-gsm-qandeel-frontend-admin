// Tests for the two rows of links under the Accounts heading: the strip of populations with its counts and the open account's own tab, the
// tab that is raised in each view, the row of views a role may use with its divider and the open count of Data requests.
import { describe, expect, it } from 'vitest';
import type { AccountCounts } from '../../types';
import { ACCOUNTS_VIEW_SPECS, usableViews } from './accountsViews';
import { countText, currentLink, stripCurrent, stripItems, viewItems } from './accountsNav';
import { buildGrants } from './useAccountGrants';

const COUNTS: AccountCounts = {
  all: 1204,
  retail: 1166,
  merchant: 38,
  guests: 310,
  active: 1100,
  suspended: 3,
  blocked: 1,
  anonymized: 0,
  invitationPending: 2,
};
const usableFor = (permissions: string[]) => usableViews(buildGrants(permissions), ACCOUNTS_VIEW_SPECS);

describe('stripItems', () => {
  it('lists the four populations with their counts, grouped with thousands separators', () => {
    expect(stripItems(COUNTS).map((item) => item.label)).toEqual([
      'All accounts (1,204)',
      'Retail (1,166)',
      'Merchants (38)',
      'Guests (310)',
    ]);
    expect(stripItems(COUNTS).map((item) => item.id)).toEqual(['all', 'retail', 'merchants', 'guests']);
  });

  it('leaves the number out while the counts load or fail', () => {
    expect(stripItems(undefined).map((item) => item.label)).toEqual([
      'All accounts',
      'Retail',
      'Merchants',
      'Guests',
    ]);
    expect(countText(undefined)).toBe('');
    expect(countText(0)).toBe(' (0)');
    expect(countText(1204)).toBe(' (1,204)');
  });

  it('links each tab to the All view of its population, or to where the page says', () => {
    expect(stripItems(COUNTS).map((item) => item.to)).toEqual([
      '/accounts',
      '/accounts?chip=retail',
      '/accounts?chip=merchants',
      '/accounts?chip=guests',
    ]);
    const restored = stripItems(COUNTS, { linkOf: (key) => `/accounts?chip=${key}&q=x` });
    expect(restored[2]?.to).toBe('/accounts?chip=merchants&q=x');
  });

  it('adds the open account as a last tab that links to its record', () => {
    const items = stripItems(COUNTS, { record: { id: 12, label: 'Ahmad Zain' } });
    expect(items).toHaveLength(5);
    expect(items.at(-1)).toEqual({ id: 'record', label: 'Ahmad Zain', to: '/accounts/12' });
  });
});

describe('stripCurrent', () => {
  it('raises the population of the All view', () => {
    expect(stripCurrent('all', { chip: null }, false)).toBe('all');
    expect(stripCurrent('all', { chip: 'guests' }, false)).toBe('guests');
  });

  it('raises nothing on the views that are not lists of accounts', () => {
    for (const view of ['ranks', 'add-rank', 'edit-rank', 'requests', 'add'] as const) {
      expect(stripCurrent(view, { chip: 'retail' }, false)).toBe('');
    }
  });

  it('raises the open account on a record', () => {
    expect(stripCurrent('all', { chip: 'retail' }, true)).toBe('record');
  });
});

describe('viewItems', () => {
  it('lists All, +Add Account, Ranks, +Add Rank and, after a divider, Data requests for the Owner', () => {
    const items = viewItems(usableFor(['*']));
    expect(items.map((item) => item.label)).toEqual([
      'All',
      'Add Account',
      'Ranks',
      'Add Rank',
      'Data requests',
    ]);
    expect(items.filter((item) => item.add).map((item) => item.id)).toEqual(['add', 'add-rank']);
    expect(items.map((item) => item.after)).toEqual([undefined, undefined, undefined, 'divider', undefined]);
    expect(items.map((item) => item.to)).toEqual([
      '/accounts',
      '/accounts?view=add',
      '/accounts?view=ranks',
      '/accounts?view=add-rank',
      '/accounts?view=requests',
    ]);
  });

  it('adds the open count to the Data requests link, and leaves it out at zero or while unknown', () => {
    const owner = usableFor(['*']);
    expect(viewItems(owner, 3).at(-1)?.label).toBe('Data requests (3)');
    expect(viewItems(owner, 0).at(-1)?.label).toBe('Data requests');
    expect(viewItems(owner, undefined).at(-1)?.label).toBe('Data requests');
    expect(viewItems(owner, 1204).at(-1)?.label).toBe('Data requests (1,204)');
  });

  it('shows each role only the views it may use, with no divider when one of the groups is empty', () => {
    expect(viewItems(usableFor(['clients:read'])).map((item) => item.label)).toEqual(['All']);
    expect(viewItems(usableFor(['clients:read', 'clients:create'])).map((item) => item.label)).toEqual([
      'All',
      'Add Account',
    ]);
    expect(viewItems(usableFor(['groups:read'])).map((item) => item.label)).toEqual(['Ranks']);
    expect(viewItems(usableFor(['groups:read', 'groups:create'])).map((item) => item.label)).toEqual([
      'Ranks',
      'Add Rank',
    ]);
    expect(
      viewItems(usableFor(['clients:read', 'customers:privacy'])).map((item) => [item.label, item.after]),
    ).toEqual([
      ['All', 'divider'],
      ['Data requests', undefined],
    ]);
    // Data requests needs both permissions.
    expect(viewItems(usableFor(['customers:privacy'])).map((item) => item.label)).toEqual([]);
  });

  it('has no link for Edit rank, and lights Ranks while a rank is edited', () => {
    expect(viewItems(usableFor(['*'])).map((item) => item.id)).not.toContain('edit-rank');
    expect(currentLink('edit-rank')).toBe('ranks');
    expect(currentLink('add-rank')).toBe('add-rank');
    expect(currentLink('all')).toBe('all');
  });
});
