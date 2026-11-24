// Tests for the parts of a record: the thirteen of the left menu in their order, which of them a merchant, a retail login and a guest show,
// what each permission takes away, what an anonymized account keeps, the number on the Orders part, and the part the address names (an
// unknown or hidden one opens the first). The addresses of the parts are the data layer's (lib/paths).
import { describe, expect, it } from 'vitest';
import { ACCOUNT_TABS, accountPath, isAccountTab } from '../../lib/paths';
import { account, guest, merchantAccount } from '../../test/fixtures';
import { ACCOUNT_TEST_ROLES } from '../../test/roles';
import { buildGrants } from '../frame/useAccountGrants';
import { ACCOUNT_PART_SPECS, visibleParts } from './accountParts';
import { openPart } from './openPart';

const OWNER = buildGrants(['*']);
const labels = (parts: { label: string }[]) => parts.map((part) => part.label);

describe('the registry', () => {
  it('holds the thirteen parts in the order of the left menu, one for each address of a part', () => {
    expect(ACCOUNT_PART_SPECS.map((part) => part.id)).toEqual([...ACCOUNT_TABS]);
    expect(labels([...ACCOUNT_PART_SPECS])).toEqual([
      'Overview',
      'Financial',
      'Profile',
      'Invoices',
      'Payments',
      'API',
      'Security',
      'Prices',
      'Orders',
      'Support',
      'Statement',
      'Privacy and risk',
      'Activity Log',
    ]);
  });

  it('writes the address of a part, and leaves the Overview out of it', () => {
    expect(accountPath(7)).toBe('/accounts/7');
    expect(accountPath(7, 'overview')).toBe('/accounts/7');
    expect(accountPath(7, 'wallet')).toBe('/accounts/7?tab=wallet');
    expect(accountPath(7, 'privacy')).toBe('/accounts/7?tab=privacy');
    expect(isAccountTab('statement')).toBe(true);
    // The words of the retired tabs are no part.
    for (const old of ['risk', 'consents', 'billing', 'pricing', 'account', 'verification']) {
      expect(isAccountTab(old), old).toBe(false);
    }
    expect(isAccountTab(null)).toBe(false);
  });
});

describe('which parts an account shows', () => {
  it('shows a merchant all thirteen, a retail login eleven and a guest seven', () => {
    expect(visibleParts(OWNER, merchantAccount())).toHaveLength(13);
    expect(labels(visibleParts(OWNER, account()))).toEqual([
      'Overview',
      'Financial',
      'Profile',
      'Invoices',
      'Payments',
      'Security',
      'Orders',
      'Support',
      'Statement',
      'Privacy and risk',
      'Activity Log',
    ]);
    // A guest never tops up (the server lists wallet top-ups only), so there is no Payments part; the receipts of their card orders are in Invoices.
    expect(labels(visibleParts(OWNER, guest()))).toEqual([
      'Overview',
      'Profile',
      'Invoices',
      'Orders',
      'Support',
      'Privacy and risk',
      'Activity Log',
    ]);
  });

  it('reads the kind of the rank fail-closed: only an explicit merchant rank gets API and Prices', () => {
    const odd = account({ rank: { ...account().rank, kind: 'wholesale' as never } });
    expect(labels(visibleParts(OWNER, odd))).not.toContain('API');
    expect(labels(visibleParts(OWNER, odd))).not.toContain('Prices');
  });

  it('takes away what a role has no permission for', () => {
    const reader = buildGrants([...ACCOUNT_TEST_ROLES.reader]);
    expect(labels(visibleParts(reader, account()))).toEqual([
      'Overview',
      'Profile',
      'Security',
      'Privacy and risk',
    ]);
    const noWallet = buildGrants([...ACCOUNT_TEST_ROLES.noWallet]);
    const names = labels(visibleParts(noWallet, merchantAccount()));
    expect(names).not.toContain('Financial');
    expect(names).not.toContain('Statement');
    expect(names).toContain('Prices');
    // Each part has the permission of its first read.
    const only = (permission: string) => labels(visibleParts(buildGrants([permission]), merchantAccount()));
    expect(only('invoices:read')).toEqual(['Invoices']);
    expect(only('payments:read')).toEqual(['Payments']);
    expect(only('api_keys:read')).toEqual(['API']);
    expect(only('pricing:read')).toEqual(['Prices']);
    expect(only('orders:read')).toEqual(['Orders']);
    expect(only('support:read')).toEqual(['Support']);
    expect(only('audit:read')).toEqual(['Activity Log']);
    expect(only('wallet:read')).toEqual(['Financial', 'Statement']);
  });

  it('shows the Financial part and the Statement only with wallet:read', () => {
    expect(labels(visibleParts(buildGrants(['clients:read', 'wallet:read']), account()))).toContain(
      'Financial',
    );
    expect(labels(visibleParts(buildGrants(['clients:read']), account()))).not.toContain('Financial');
  });

  it('keeps for an anonymized account what accounting needs, and hides the rest', () => {
    const gone = merchantAccount({ status: 'anonymized' });
    expect(labels(visibleParts(OWNER, gone))).toEqual([
      'Overview',
      'Invoices',
      'Payments',
      'Orders',
      'Support',
      'Statement',
      'Privacy and risk',
      'Activity Log',
    ]);
  });

  it('keeps the payments of an anonymized account whose login the server cleared, and still hides them from a live guest', () => {
    // Anonymizing sets hasAccount to false, yet the account keeps the top-ups it made, for accounting.
    const cleared = account({ status: 'anonymized', hasAccount: false, security: null });
    expect(labels(visibleParts(OWNER, cleared))).toEqual(
      expect.arrayContaining(['Invoices', 'Payments', 'Orders']),
    );
    expect(labels(visibleParts(OWNER, guest()))).not.toContain('Payments');
    expect(labels(visibleParts(OWNER, guest()))).toContain('Invoices');
  });

  it('puts the number of orders on the Orders part and on no other', () => {
    const counts = visibleParts(OWNER, account({ ordersCount: 4 })).map((part) =>
      part.count?.(account({ ordersCount: 4 })),
    );
    expect(counts.filter((count) => count !== undefined)).toEqual([4]);
  });
});

describe('openPart', () => {
  it('opens the part the address names', () => {
    const open = openPart(account({ id: 101 }), 'security', OWNER);
    expect(open.current?.id).toBe('security');
    expect(open.scope).toBe('101:security');
  });

  it('opens the first part when the address names none, an unknown one, or one the role or the account does not show', () => {
    expect(openPart(account({ id: 5 }), null, OWNER).current?.id).toBe('overview');
    // The API part is for merchant ranks; the Financial part needs wallet:read.
    expect(openPart(account({ id: 5 }), 'api', OWNER).current?.id).toBe('overview');
    expect(openPart(account({ id: 5 }), 'wallet', buildGrants(['clients:read'])).current?.id).toBe(
      'overview',
    );
    expect(openPart(account({ id: 5 }), 'audit', buildGrants(['clients:read'])).scope).toBe('5:overview');
  });

  it('gives each part of each account its own scope', () => {
    expect(openPart(account({ id: 5 }), 'orders', OWNER).scope).not.toBe(
      openPart(account({ id: 6 }), 'orders', OWNER).scope,
    );
    expect(openPart(account({ id: 5 }), 'orders', OWNER).scope).not.toBe(
      openPart(account({ id: 5 }), 'support', OWNER).scope,
    );
  });
});
