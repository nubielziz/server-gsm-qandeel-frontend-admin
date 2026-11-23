// Tests for the addresses into and out of the Catalog page (ARCHITECTURE §5.2): the table with its filters and panel, the settings view
// with its tabs, the publish view with a run, and the supplier and merchant pages.
import { describe, expect, it } from 'vitest';
import { catalogPath, MERCHANT_GROUPS_PATH, supplierLink } from './paths';

describe('catalogPath: the table', () => {
  it('is the bare page with nothing set, and leaves out what is empty or a first page', () => {
    expect(catalogPath()).toBe('/catalog');
    expect(catalogPath({})).toBe('/catalog');
    expect(catalogPath({ q: '', page: 1 })).toBe('/catalog');
  });

  it('opens the services priced under their floor (the dashboard’s link)', () => {
    expect(catalogPath({ belowFloor: true })).toBe('/catalog?belowFloor=true');
    expect(catalogPath({ belowFloor: false })).toBe('/catalog');
  });

  it('filters by text, type, category and supplier', () => {
    expect(catalogPath({ q: 'AT&T', type: 'imei' })).toBe('/catalog?q=AT%26T&type=imei');
    expect(catalogPath({ categoryId: 3, supplierId: 6 })).toBe('/catalog?categoryId=3&supplierId=6');
  });

  it('names a chip and the services on the shop', () => {
    expect(catalogPath({ shop: 'on' })).toBe('/catalog?shop=on');
    expect(catalogPath({ chip: 'attention' })).toBe('/catalog?chip=attention');
    expect(catalogPath({ chip: 'notonshop' })).toBe('/catalog?chip=notonshop');
    expect(catalogPath({ chip: 'off' })).toBe('/catalog?chip=off');
  });

  it('keeps the page (from the second), the sort and its direction', () => {
    expect(catalogPath({ page: 2, sort: 'retailPrice', dir: 'desc' })).toBe(
      '/catalog?page=2&sort=retailPrice&dir=desc',
    );
  });

  it('opens one service in the panel, on a section when it names one', () => {
    expect(catalogPath({ open: 7 })).toBe('/catalog?open=7');
    expect(catalogPath({ open: 7, section: 'prices' })).toBe('/catalog?open=7&section=prices');
  });

  it('opens the Add services flow for a supplier, or for a service of one’s own', () => {
    expect(catalogPath({ add: 6, from: 'groups' })).toBe('/catalog?add=6&from=groups');
    expect(catalogPath({ add: 6, from: 'services' })).toBe('/catalog?add=6&from=services');
    expect(catalogPath({ add: 'new' })).toBe('/catalog?add=new');
  });

  it('writes the keys in a fixed order, whatever the order of the call', () => {
    expect(catalogPath({ open: 7, q: 'tool', shop: 'on', chip: 'off' })).toBe(
      '/catalog?shop=on&chip=off&q=tool&open=7',
    );
  });
});

describe('catalogPath: the settings view', () => {
  it('opens the view on its first tab, or on a named one', () => {
    expect(catalogPath({ view: 'settings' })).toBe('/catalog?view=settings');
    expect(catalogPath({ view: 'settings', tab: 'categories' })).toBe(
      '/catalog?view=settings&tab=categories',
    );
    expect(catalogPath({ view: 'settings', tab: 'rules' })).toBe('/catalog?view=settings&tab=rules');
  });

  it('opens the shop price rules, optionally with every price change', () => {
    expect(catalogPath({ view: 'settings', tab: 'shop-prices' })).toBe(
      '/catalog?view=settings&tab=shop-prices',
    );
    expect(catalogPath({ view: 'settings', tab: 'shop-prices', show: 'all' })).toBe(
      '/catalog?view=settings&tab=shop-prices&show=all',
    );
  });

  it('opens the resolver on one service, optionally for one merchant', () => {
    expect(catalogPath({ view: 'settings', tab: 'resolver', service: 4 })).toBe(
      '/catalog?view=settings&tab=resolver&service=4',
    );
    expect(catalogPath({ view: 'settings', tab: 'resolver', service: 4, merchant: 12 })).toBe(
      '/catalog?view=settings&tab=resolver&service=4&merchant=12',
    );
  });

  it('opens the code stock of one service by status and page', () => {
    expect(catalogPath({ view: 'settings', tab: 'inventory', service: 16, status: 'sold' })).toBe(
      '/catalog?view=settings&tab=inventory&status=sold&service=16',
    );
    expect(catalogPath({ view: 'settings', tab: 'inventory', page: 2 })).toBe(
      '/catalog?view=settings&tab=inventory&page=2',
    );
    expect(catalogPath({ view: 'settings', tab: 'inventory', page: 1 })).toBe(
      '/catalog?view=settings&tab=inventory',
    );
  });
});

describe('catalogPath: the publish view', () => {
  it('opens the start of the view, or one run', () => {
    expect(catalogPath({ view: 'publish' })).toBe('/catalog?view=publish');
    expect(catalogPath({ view: 'publish', run: 12 })).toBe('/catalog?view=publish&run=12');
  });
});

describe('links out', () => {
  it('names the supplier and merchant group addresses', () => {
    expect(supplierLink(6)).toBe('/suppliers?supplier=6');
    expect(MERCHANT_GROUPS_PATH).toBe('/merchants?tab=groups');
  });
});
