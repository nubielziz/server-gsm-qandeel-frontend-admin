// Tests for the feature manifest collector: found manifests, sorted by id, and loud failures for wiring mistakes.
import { describe, expect, it } from 'vitest';
import type { FeatureManifest } from './featureManifest';
import { collectManifests, featureManifests } from './features';

const page = (name: string) => ({ name, heading: name, list: async () => () => null });

describe('collectManifests', () => {
  it('returns the manifests sorted by id', () => {
    const found = { b: { manifest: { id: 'b' } }, a: { manifest: { id: 'a' } } };
    expect(collectManifests(found).map((manifest) => manifest.id)).toEqual(['a', 'b']);
  });

  it('fails on a file without a manifest, a duplicate id or a page claimed twice', () => {
    expect(() => collectManifests({ 'x/manifest.ts': {} })).toThrow('x/manifest.ts must export `manifest`');
    expect(() => collectManifests({ a: { manifest: { id: 'a' } }, b: { manifest: { id: 'a' } } })).toThrow(
      'Two feature manifests use the id "a"',
    );
    const one: FeatureManifest = { id: 'one', page: page('orders') };
    const two: FeatureManifest = { id: 'two', page: page('orders') };
    expect(() => collectManifests({ one: { manifest: one }, two: { manifest: two } })).toThrow(
      'Two features fill the page "orders"',
    );
  });
});

describe('featureManifests', () => {
  it('finds the built features of this app', () => {
    expect(featureManifests.map((manifest) => manifest.id)).toEqual(
      expect.arrayContaining(['access', 'finance', 'orders', 'notifications']),
    );
  });

  // The accounts feature's manifest holds the Accounts page, and the merchants and customers features are gone.
  it('fills the Accounts page with one feature, and no feature fills the pages of Merchants or Customers', () => {
    const pages = featureManifests.flatMap((manifest) => (manifest.page ? [manifest.page.name] : []));
    expect(pages.filter((name) => name === 'accounts')).toHaveLength(1);
    expect(pages).not.toContain('merchants');
    expect(pages).not.toContain('customers');
    const accounts = featureManifests.find((manifest) => manifest.id === 'accounts');
    expect(accounts?.page).toMatchObject({ name: 'accounts', heading: 'Accounts' });
    expect(accounts?.page?.list).toBeTypeOf('function');
    expect(accounts?.page?.detail).toBeTypeOf('function');
    // The same any-of permission as the page resource, so a role that holds only `groups:read` still opens the page.
    expect(accounts?.page?.permission).toEqual(['clients:read', 'groups:read']);
  });

  // The money feature's manifest holds the Money page; the finance and refunds features keep their data and palette but no page.
  it('fills the Money page with one feature, and no page with the finance or refunds feature', () => {
    const pages = featureManifests.flatMap((manifest) => (manifest.page ? [manifest.page.name] : []));
    expect(pages.filter((name) => name === 'money')).toHaveLength(1);
    expect(pages).not.toContain('finance');
    expect(pages).not.toContain('refunds');
    const money = featureManifests.find((manifest) => manifest.id === 'money');
    expect(money?.page).toMatchObject({ name: 'money', heading: 'Money' });
    expect(money?.page?.list).toBeTypeOf('function');
    expect(money?.page?.detail).toBeUndefined();
    // The same any-of permission as the page resource: each of the views then checks its own.
    expect(money?.page?.permission).toEqual([
      'ledger:read',
      'payments:read',
      'wallet:read',
      'invoices:read',
      'reports:read',
      'reports:finance',
      'reports:growth',
      'refunds:read',
      'disputes:read',
    ]);
    for (const id of ['finance', 'refunds']) {
      const manifest = featureManifests.find((candidate) => candidate.id === id);
      expect(manifest?.page).toBeUndefined();
      expect(manifest?.registry).toBeDefined();
    }
  });

  it('gives the Notifications page a list and a detail view, and the staff bell to the top bar', () => {
    const notifications = featureManifests.find((manifest) => manifest.id === 'notifications');
    expect(notifications?.page).toMatchObject({ name: 'notifications', heading: 'Notifications' });
    expect(notifications?.page?.detail).toBeTypeOf('function');
    expect(notifications?.topbar).toBeTypeOf('function');
  });
});
