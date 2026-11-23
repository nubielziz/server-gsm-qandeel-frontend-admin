// Tests for the address of the All view: what is read from it (anything unknown or malformed is dropped), what is written (the first page,
// the default size and an empty search are left out, in the order productsPath writes them), which quick filters a role may use, and the
// question the server is asked for a kind and an address.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_ADDRESS,
  LIST_SORT,
  allLink,
  hasFilters,
  listQueryOf,
  parseAllAddress,
  showOptions,
  usableShow,
  type AllAddress,
} from './allAddress';

const parse = (query: string) => parseAllAddress(new URLSearchParams(query));
const OWNER = { storefront: true };
const READER = { storefront: false };

describe('parseAllAddress', () => {
  it('reads an address with no keys as the whole first page at the default size', () => {
    expect(parse('')).toEqual(EMPTY_ADDRESS);
    expect(EMPTY_ADDRESS.size).toBe(DEFAULT_PAGE_SIZE);
    expect(DEFAULT_PAGE_SIZE).toBe(50);
  });

  it('reads every key of the list', () => {
    expect(parse('view=all&type=server&q=chimera&group=7&api=2&show=attention&page=3&size=100')).toEqual({
      q: 'chimera',
      group: 7,
      api: 2,
      show: 'attention',
      page: 3,
      size: 100,
    });
  });

  it.each([
    ['group=abc', { group: null }],
    ['group=0', { group: null }],
    ['api=-3', { api: null }],
    ['show=nothing', { show: null }],
    // `all` is the shop price rules' list of every change, not a filter of this list
    ['show=all', { show: null }],
    ['page=0', { page: 1 }],
    ['page=x', { page: 1 }],
    ['page=2.5', { page: 1 }],
    ['size=7', { size: 50 }],
    ['size=', { size: 50 }],
  ])('drops %s', (query, expected) => {
    expect(parse(query)).toEqual({ ...EMPTY_ADDRESS, ...expected });
  });

  it('accepts each page size the footer offers', () => {
    for (const size of [25, 50, 100, 200]) expect(parse(`size=${size}`).size).toBe(size);
  });
});

describe('allLink', () => {
  it('writes the list of a kind with nothing else', () => {
    expect(allLink('server')).toBe('/products?view=all&type=server');
  });

  it('writes the keys in the order productsPath writes them, leaving out the first page and the default size', () => {
    const address: AllAddress = { q: ' chimera ', group: 3, api: 2, show: 'attention', page: 2, size: 100 };
    expect(allLink('imei', address)).toBe(
      '/products?view=all&type=imei&group=3&q=chimera&api=2&show=attention&page=2&size=100',
    );
    expect(allLink('imei', { ...address, page: 1, size: 50 })).toBe(
      '/products?view=all&type=imei&group=3&q=chimera&api=2&show=attention',
    );
  });

  it('leaves out a search that is only spaces', () => {
    expect(allLink('remote', { q: '   ' })).toBe('/products?view=all&type=remote');
  });

  it('is read back as the address it was written from', () => {
    const address: AllAddress = { q: 'z3x', group: 6, api: 2, show: 'disabled', page: 4, size: 25 };
    expect(parse(allLink('server', address).split('?')[1])).toEqual(address);
  });
});

describe('hasFilters', () => {
  it('is on for a search, a group, an API or a quick filter, and off for the page and the size', () => {
    expect(hasFilters(EMPTY_ADDRESS)).toBe(false);
    expect(hasFilters({ ...EMPTY_ADDRESS, page: 3, size: 200 })).toBe(false);
    expect(hasFilters({ ...EMPTY_ADDRESS, q: '  ' })).toBe(false);
    expect(hasFilters({ ...EMPTY_ADDRESS, q: 'x' })).toBe(true);
    expect(hasFilters({ ...EMPTY_ADDRESS, group: 1 })).toBe(true);
    expect(hasFilters({ ...EMPTY_ADDRESS, api: 1 })).toBe(true);
    expect(hasFilters({ ...EMPTY_ADDRESS, show: 'disabled' })).toBe(true);
  });
});

describe('what a role may filter by', () => {
  it('drops "Not on the shop" for a role that may not read the shop and keeps the rest', () => {
    expect(usableShow('offshop', READER)).toBeNull();
    expect(usableShow('offshop', OWNER)).toBe('offshop');
    expect(usableShow('attention', READER)).toBe('attention');
    expect(usableShow('disabled', READER)).toBe('disabled');
    expect(usableShow(null, READER)).toBeNull();
  });

  it('offers the four choices to a role that reads the shop and three to one that does not', () => {
    expect(showOptions(OWNER).map((option) => option.value)).toEqual([
      '',
      'attention',
      'offshop',
      'disabled',
    ]);
    expect(showOptions(READER).map((option) => option.value)).toEqual(['', 'attention', 'disabled']);
    expect(showOptions(OWNER)[0].label).toBe('Show: All services');
  });
});

describe('listQueryOf', () => {
  it('asks for the first page of the kind in the stored order, the one merchants see', () => {
    expect(listQueryOf('server', EMPTY_ADDRESS, OWNER)).toEqual({
      start: 0,
      end: 50,
      sort: ['sort'],
      order: ['asc'],
      filters: { type: 'server' },
    });
  });

  it('sorts by the stored order whatever the filters, never by name', () => {
    const query = listQueryOf(
      'imei',
      { ...EMPTY_ADDRESS, q: 'unlock', group: 4, api: 6, show: 'disabled', page: 2 },
      OWNER,
    );
    expect(query.sort).toEqual([LIST_SORT]);
    expect(LIST_SORT).toBe('sort');
    expect(query.order).toEqual(['asc']);
  });

  it('asks for the rows of the page the address names', () => {
    const query = listQueryOf('imei', { ...EMPTY_ADDRESS, page: 3, size: 25 }, OWNER);
    expect([query.start, query.end]).toEqual([50, 75]);
  });

  it('sends the search, the group as categoryId and the API as supplierId', () => {
    const query = listQueryOf('imei', { ...EMPTY_ADDRESS, q: ' unlock ', group: 4, api: 6 }, OWNER);
    expect(query.q).toBe('unlock');
    expect(query.filters).toEqual({ type: 'imei', categoryId: 4, supplierId: 6 });
  });

  it.each([
    ['attention', { needsAttention: true }],
    ['offshop', { notOnShop: true }],
    ['disabled', { status: 'disabled' }],
  ] as const)('turns the quick filter %s into %j', (show, filter) => {
    expect(listQueryOf('imei', { ...EMPTY_ADDRESS, show }, OWNER).filters).toEqual({
      type: 'imei',
      ...filter,
    });
  });

  it('never sends "Not on the shop" for a role that may not read the shop (the server would answer 403)', () => {
    expect(listQueryOf('imei', { ...EMPTY_ADDRESS, show: 'offshop' }, READER).filters).toEqual({
      type: 'imei',
    });
  });

  it('sends no search when it is only spaces', () => {
    expect(listQueryOf('imei', { ...EMPTY_ADDRESS, q: '  ' }, OWNER)).not.toHaveProperty('q');
  });
});
