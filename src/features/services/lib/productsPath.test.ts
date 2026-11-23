// Tests for the addresses of the Product / Services page: what `productsPath` writes (and in which order), what it leaves out, and how an
// address is read back (kind, view, part, record id).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KIND,
  isProductsView,
  PRODUCTS_PATH,
  PRODUCTS_VIEWS,
  parseKind,
  parsePart,
  parseRecordId,
  productsPath,
  RULES_TABS,
  SERVICE_PARTS,
} from './productsPath';

describe('productsPath', () => {
  it('is the bare page with no state', () => {
    expect(PRODUCTS_PATH).toBe('/products');
    expect(productsPath()).toBe('/products');
    expect(productsPath({})).toBe('/products');
    expect(productsPath({ q: '', page: 1 })).toBe('/products');
  });

  it('names a view and a kind', () => {
    expect(productsPath({ view: 'groups' })).toBe('/products?view=groups');
    expect(productsPath({ type: 'server' })).toBe('/products?type=server');
    expect(productsPath({ view: 'pricing', type: 'remote' })).toBe('/products?view=pricing&type=remote');
  });

  it('says where +Add Group goes back to when it was opened from +Add Service', () => {
    expect(productsPath({ view: 'add-group', type: 'imei', return: 'add' })).toBe(
      '/products?view=add-group&type=imei&return=add',
    );
  });

  it('names every view of the page', () => {
    for (const view of PRODUCTS_VIEWS) expect(productsPath({ view })).toBe(`/products?view=${view}`);
  });

  it('writes the keys of the list in one fixed order, whatever order they were given in', () => {
    expect(
      productsPath({
        page: 3,
        show: 'attention',
        api: 2,
        q: 'unlock',
        group: 4,
        type: 'imei',
        view: 'all',
        size: 100,
      }),
    ).toBe('/products?view=all&type=imei&group=4&q=unlock&api=2&show=attention&page=3&size=100');
  });

  it('leaves out an empty search and a first page', () => {
    expect(productsPath({ view: 'all', q: '', page: 1 })).toBe('/products?view=all');
    expect(productsPath({ view: 'all', page: 0 })).toBe('/products?view=all');
    expect(productsPath({ view: 'all', page: 2 })).toBe('/products?view=all&page=2');
  });

  it('writes the quick filter of the list, and the shop price rules’ every-change list', () => {
    expect(productsPath({ view: 'all', show: 'offshop' })).toBe('/products?view=all&show=offshop');
    expect(productsPath({ view: 'all', show: 'disabled' })).toBe('/products?view=all&show=disabled');
    expect(productsPath({ view: 'rules', tab: 'shop', show: 'all' })).toBe(
      '/products?view=rules&tab=shop&show=all',
    );
  });

  it('names one service and a part of it', () => {
    expect(productsPath({ view: 'edit', id: 7 })).toBe('/products?view=edit&id=7');
    expect(productsPath({ view: 'edit', type: 'server', id: 7, part: 'pricing' })).toBe(
      '/products?view=edit&type=server&id=7&part=pricing',
    );
    for (const part of SERVICE_PARTS)
      expect(productsPath({ view: 'edit', id: 7, part })).toContain(`part=${part}`);
  });

  it('names a supplier to add services from, and how to start', () => {
    expect(productsPath({ view: 'add', supplier: 6 })).toBe('/products?view=add&supplier=6');
    expect(productsPath({ view: 'add', supplier: 6, from: 'groups' })).toBe(
      '/products?view=add&supplier=6&from=groups',
    );
    expect(productsPath({ view: 'add', from: 'services' })).toBe('/products?view=add&from=services');
  });

  it('names a publish run, and a tab of the price rules', () => {
    expect(productsPath({ view: 'publish' })).toBe('/products?view=publish');
    expect(productsPath({ view: 'publish', run: 12 })).toBe('/products?view=publish&run=12');
    for (const tab of RULES_TABS)
      expect(productsPath({ view: 'rules', tab })).toBe(`/products?view=rules&tab=${tab}`);
  });

  it('encodes a search text', () => {
    expect(productsPath({ view: 'all', q: 'AT&T USA' })).toBe('/products?view=all&q=AT%26T+USA');
  });
});

describe('parseKind', () => {
  it('reads the four kinds', () => {
    for (const kind of ['imei', 'server', 'remote', 'file'] as const) expect(parseKind(kind)).toBe(kind);
  });

  it('is IMEI for a missing or unknown kind', () => {
    expect(DEFAULT_KIND).toBe('imei');
    for (const raw of [null, '', 'IMEI', 'banana', 'imei ']) expect(parseKind(raw)).toBe('imei');
  });
});

describe('isProductsView', () => {
  it('knows the views of the page and nothing else', () => {
    for (const view of PRODUCTS_VIEWS) expect(isProductsView(view)).toBe(true);
    for (const raw of [null, '', 'settings', 'table', 'ALL', 'edit '])
      expect(isProductsView(raw)).toBe(false);
  });
});

describe('parsePart', () => {
  it('reads the parts of a service and drops what is not one', () => {
    for (const part of SERVICE_PARTS) expect(parsePart(part)).toBe(part);
    for (const raw of [null, '', 'details', 'prices', 'Overview']) expect(parsePart(raw)).toBeNull();
  });
});

describe('parseRecordId', () => {
  it('reads a whole number from 1 up', () => {
    expect(parseRecordId('7')).toBe(7);
    expect(parseRecordId('1200')).toBe(1200);
  });

  it('is null for anything else', () => {
    for (const raw of [null, '', 'abc', '0', '-3', '1.5', '007', '7 ', '99999999999999999999']) {
      expect(parseRecordId(raw)).toBeNull();
    }
  });
});
