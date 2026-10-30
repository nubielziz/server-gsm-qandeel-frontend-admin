// Tests for the small helpers: group labels, API key states, verification documents, input hints, addresses and the tabs of the
// detail page.
import { describe, expect, it } from 'vitest';
import { parseDetailTab, writeDetailTab } from './detailTabs';
import { defaultGroupId, groupLabel, isRetailGroup, merchantGroups, percentText } from './groups';
import { cleanCountry, cleanEmail, joinedText, validCountry, validEmail } from './input';
import { apiKeyState } from './keys';
import { documentsOf, fileSize } from './kyc';
import { merchantPath, merchantsListPath } from './paths';
import { isMerchantTab, isStatusTab, tabStatus } from './status';
import type { ClientGroup } from '../types';

const group = (over: Partial<ClientGroup>): ClientGroup => ({
  id: 1,
  name: 'Standard',
  kind: 'b2b',
  discountPercent: '0.0000',
  isDefault: false,
  earnThreshold: '0.0000',
  depositLimit: '0.0000',
  overdraftAllowed: false,
  sort: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('groups', () => {
  it('writes a group as the demo did: the name and, with a discount, the discount', () => {
    expect(groupLabel(group({}))).toBe('Standard');
    expect(groupLabel(group({ name: 'Wholesale', discountPercent: '4.0000' }))).toBe('Wholesale (-4%)');
    expect(groupLabel(group({ name: 'Odd', discountPercent: '2.5000' }))).toBe('Odd (-2.5%)');
  });

  it('writes a percent without extra zeros, and a dash for one it cannot read', () => {
    expect(percentText('4.0000')).toBe('4%');
    expect(percentText('2.50')).toBe('2.5%');
    expect(percentText('x')).toBe('–');
  });

  it('keeps the storefront’s retail group out of the groups a merchant can be put in', () => {
    const groups = [group({ id: 1 }), group({ id: 4, kind: 'b2c_retail' })];
    expect(isRetailGroup(groups[1])).toBe(true);
    expect(merchantGroups(groups).map((g) => g.id)).toEqual([1]);
  });

  it('starts a new merchant in the default group, else the first', () => {
    expect(defaultGroupId([group({ id: 1 }), group({ id: 2, isDefault: true })])).toBe(2);
    expect(defaultGroupId([group({ id: 5 })])).toBe(5);
    expect(defaultGroupId([])).toBeUndefined();
  });
});

describe('apiKeyState', () => {
  const now = Date.parse('2026-06-01T00:00:00.000Z');
  it('is revoked once revokedAt is set, expired once expiresAt has passed, and active otherwise', () => {
    expect(apiKeyState({ revokedAt: null, expiresAt: null }, now)).toBe('active');
    expect(apiKeyState({ revokedAt: '2026-05-01T00:00:00.000Z', expiresAt: null }, now)).toBe('revoked');
    expect(apiKeyState({ revokedAt: null, expiresAt: '2026-05-01T00:00:00.000Z' }, now)).toBe('expired');
    expect(apiKeyState({ revokedAt: null, expiresAt: '2026-07-01T00:00:00.000Z' }, now)).toBe('active');
    // A revoked key stays revoked even if it has also expired.
    expect(
      apiKeyState({ revokedAt: '2026-05-01T00:00:00.000Z', expiresAt: '2026-05-02T00:00:00.000Z' }, now),
    ).toBe('revoked');
  });
});

describe('verification documents', () => {
  it('names a document by its file when the server joined it, else by its place in the request', () => {
    expect(
      documentsOf({
        fileIds: [7, 8],
        files: [{ id: 8, filename: 'passport.jpg', mime: 'image/jpeg', size: 482_000 }],
      }),
    ).toEqual([
      { id: 7, label: 'Document 1', size: undefined },
      { id: 8, label: 'passport.jpg', size: '482 kB' },
    ]);
  });

  it('writes sizes the way people read them', () => {
    expect(fileSize(512)).toBe('512 B');
    expect(fileSize(482_000)).toBe('482 kB');
    expect(fileSize(1_240_000)).toBe('1.2 MB');
  });
});

describe('input hints', () => {
  it('checks the email shape the demo checked and sends it trimmed and lower case', () => {
    expect(validEmail('owner@example.com')).toBe(true);
    expect(validEmail(' owner@example.com ')).toBe(true);
    expect(validEmail('owner@example')).toBe(false);
    expect(validEmail('owner example.com')).toBe(false);
    expect(cleanEmail(' Ops@Shop.Example ')).toBe('ops@shop.example');
  });

  it('wants two letters for a country and sends them upper case', () => {
    expect(validCountry('jo')).toBe(true);
    expect(validCountry('JOR')).toBe(false);
    expect(validCountry('1a')).toBe(false);
    expect(cleanCountry(' jo ')).toBe('JO');
  });

  it('says how long ago a merchant joined, in whole days', () => {
    const now = Date.parse('2026-06-01T12:00:00.000Z');
    expect(joinedText('2026-06-01T01:00:00.000Z', now)).toBe('Joined today');
    expect(joinedText('2026-05-31T01:00:00.000Z', now)).toBe('Joined 1 day ago');
    expect(joinedText('2025-04-18T12:00:00.000Z', now)).toBe('Joined 409 days ago');
    expect(joinedText('not a date', now)).toBe('');
  });
});

describe('addresses and tabs', () => {
  it('builds the address of a merchant, on a tab when it is not the first', () => {
    expect(merchantPath(7)).toBe('/merchants/7');
    expect(merchantPath(7, 'orders')).toBe('/merchants/7');
    expect(merchantPath(7, 'wallet')).toBe('/merchants/7?tab=wallet');
  });

  it('builds the address of the filtered list, leaving defaults out', () => {
    expect(merchantsListPath()).toBe('/merchants');
    expect(merchantsListPath({ tab: 'all' })).toBe('/merchants');
    expect(merchantsListPath({ tab: 'pending' })).toBe('/merchants?tab=pending');
    expect(merchantsListPath({ tab: 'groups', group: 3, q: 'zain' })).toBe(
      '/merchants?tab=groups&group=3&q=zain',
    );
  });

  it('knows which tabs show the merchant table and which status each filters by', () => {
    expect(isMerchantTab('groups')).toBe(true);
    expect(isMerchantTab('nope')).toBe(false);
    expect(isStatusTab('suspended')).toBe(true);
    expect(isStatusTab('verification')).toBe(false);
    expect(tabStatus('pending')).toBe('pending');
    expect(tabStatus('all')).toBeUndefined();
  });

  it('opens a detail tab from the address, falling back to the first the role may open', () => {
    expect(parseDetailTab(new URLSearchParams('tab=pricing'), ['orders', 'pricing'])).toBe('pricing');
    expect(parseDetailTab(new URLSearchParams('tab=api'), ['orders', 'pricing'])).toBe('orders');
    expect(parseDetailTab(new URLSearchParams(''), [])).toBeUndefined();
    expect(writeDetailTab(new URLSearchParams('tab=wallet&order=5'), 'orders').toString()).toBe('');
    expect(writeDetailTab(new URLSearchParams('order=5'), 'api').toString()).toBe('tab=api');
  });
});
