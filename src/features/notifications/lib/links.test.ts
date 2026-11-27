// Tests for the link menus of the campaign message: the pages of each kind of person, the menu and what counts as a known page.
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_PAGES,
  ANOTHER_PAGE,
  isKnownPage,
  linkOptions,
  NO_LINK,
  pagesFor,
  STAFF_PAGES,
  startsAsAnotherPage,
} from './links';

describe('the pages of each kind of person', () => {
  it('gives staff the console pages and merchants and retail accounts the shop account pages', () => {
    expect(pagesFor('staff')).toBe(STAFF_PAGES);
    expect(pagesFor('merchant')).toBe(ACCOUNT_PAGES);
    expect(pagesFor('customer')).toBe(ACCOUNT_PAGES);
  });

  it('holds only paths the site-path rule takes, each once', () => {
    for (const pages of [STAFF_PAGES, ACCOUNT_PAGES]) {
      const paths = pages.map((page) => page.path);
      expect(new Set(paths).size).toBe(paths.length);
      for (const path of paths) expect(path).toMatch(/^\/(?!\/)[A-Za-z0-9\-._~/]{0,199}$/);
    }
    // Every account page is in the account area, where the server wants a merchant link.
    for (const page of ACCOUNT_PAGES) expect(page.path).toMatch(/^\/account(\/|$)/);
    expect(STAFF_PAGES.map((page) => page.label)).toEqual(
      expect.arrayContaining(['Orders', 'Product / Services', 'Accounts', 'Money', 'Support']),
    );
  });

  it('lists the pages the shop has under /account, and not the retired price list, which only redirects', () => {
    // The shop's app/en/account folder has a page for each of these (checked against it); /account/services has none, it ends at /services.
    expect(ACCOUNT_PAGES.map((page) => page.path)).toEqual([
      '/account',
      '/account/orders',
      '/account/wallet',
      '/account/invoices',
      '/account/support',
      '/account/notifications',
      '/account/settings',
    ]);
    expect(isKnownPage('merchant', '/account/services')).toBe(false);
    expect(startsAsAnotherPage('merchant', '/account/services')).toBe(true);
  });
});

describe('the menu', () => {
  it('starts with no link, lists the pages, and ends with another page', () => {
    const options = linkOptions('customer');
    expect(options[0]).toEqual({ value: NO_LINK, label: 'No link' });
    expect(options.at(-1)).toEqual({ value: ANOTHER_PAGE, label: 'Another page…' });
    expect(options).toContainEqual({ value: '/account/orders', label: 'Orders' });
    expect(options).toHaveLength(ACCOUNT_PAGES.length + 2);
  });

  it('knows a page by its exact path, and treats any other stored text as another page', () => {
    expect(isKnownPage('staff', '/orders')).toBe(true);
    expect(isKnownPage('staff', '/account/orders')).toBe(false);
    expect(isKnownPage('customer', '/account/orders')).toBe(true);
    expect(startsAsAnotherPage('customer', '')).toBe(false);
    expect(startsAsAnotherPage('customer', '   ')).toBe(false);
    expect(startsAsAnotherPage('customer', '/account/orders')).toBe(false);
    expect(startsAsAnotherPage('customer', '/account/settings/security')).toBe(true);
    expect(startsAsAnotherPage('staff', '/orders?order=7')).toBe(true);
  });
});
