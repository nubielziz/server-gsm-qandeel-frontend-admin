// Tests for the Catalog table's address parameters (chip, filters, page, sort) and for the API filters built from them.
import { describe, expect, it } from 'vitest';
import {
  clearServiceFilters,
  DEFAULT_SORT,
  hasActiveFilters,
  parsePage,
  parseServiceFilters,
  parseSort,
  toListFilters,
  toListQuery,
  usableFilters,
  writeServiceFilters,
  writeView,
} from './filters';

const params = (text: string) => new URLSearchParams(text);
const NONE = { chip: '', q: '', type: '', categoryId: '', supplierId: '', belowFloor: false, shop: false };

describe('parseServiceFilters', () => {
  it('reads an empty address as every service and no filter', () => {
    expect(parseServiceFilters(params(''))).toEqual(NONE);
  });

  it('reads the chip and every filter', () => {
    expect(
      parseServiceFilters(
        params('chip=attention&q=unlock&type=server&categoryId=4&supplierId=2&belowFloor=true&shop=on'),
      ),
    ).toEqual({
      chip: 'attention',
      q: 'unlock',
      type: 'server',
      categoryId: '4',
      supplierId: '2',
      belowFloor: true,
      shop: true,
    });
  });

  it('reads an old status=disabled as the Switched off chip, so it never filters out of sight', () => {
    expect(parseServiceFilters(params('status=disabled')).chip).toBe('off');
    expect(parseServiceFilters(params('status=disabled&chip=attention')).chip).toBe('attention');
  });

  it('drops values it does not know', () => {
    expect(
      parseServiceFilters(
        params('chip=hot&type=sim&categoryId=0&supplierId=x&belowFloor=1&shop=yes&status=active'),
      ),
    ).toEqual(NONE);
  });
});

describe('writeServiceFilters', () => {
  it('leaves the defaults out of the address', () => {
    expect(
      writeServiceFilters(params('belowFloor=true&shop=on'), { belowFloor: false, shop: false }).toString(),
    ).toBe('');
  });

  it('changes one filter and keeps everything else, the open service included', () => {
    const next = writeServiceFilters(params('open=9&page=3&q=abc'), { type: 'file', q: '', categoryId: '7' });
    expect(next.get('open')).toBe('9');
    expect(next.get('page')).toBe('3');
    expect(next.get('type')).toBe('file');
    expect(next.get('categoryId')).toBe('7');
    expect(next.has('q')).toBe(false);
  });

  it('writes the chip and replaces the old status parameter with it', () => {
    expect(writeServiceFilters(params('status=disabled'), {}).toString()).toBe('chip=off');
    expect(writeServiceFilters(params('chip=off'), { chip: '' }).toString()).toBe('');
    expect(writeServiceFilters(params(''), { chip: 'notonshop', shop: true }).toString()).toBe(
      'chip=notonshop&shop=on',
    );
  });
});

describe('hasActiveFilters and clearServiceFilters', () => {
  it('counts every toolbar filter but not the chip, ignoring blank search text', () => {
    expect(hasActiveFilters(parseServiceFilters(params('q=%20')))).toBe(false);
    expect(hasActiveFilters(parseServiceFilters(params('chip=off')))).toBe(false);
    for (const text of ['belowFloor=true', 'shop=on', 'categoryId=3', 'supplierId=1', 'type=imei']) {
      expect(hasActiveFilters(parseServiceFilters(params(text)))).toBe(true);
    }
  });

  it('removes the filters and the page, and keeps the chip and the sort', () => {
    const next = clearServiceFilters(
      params(
        'chip=attention&q=a&type=imei&categoryId=2&supplierId=3&belowFloor=true&shop=on&page=2&sort=cost&dir=desc',
      ),
    );
    expect(next.toString()).toBe('chip=attention&sort=cost&dir=desc');
  });
});

describe('usableFilters', () => {
  const shopFilters = parseServiceFilters(params('chip=notonshop&shop=on&q=a'));

  it('keeps the shop filters for a role that may read the shop', () => {
    expect(usableFilters(shopFilters, { storefront: true })).toEqual(shopFilters);
  });

  it('drops them without storefront:read, which the server would refuse', () => {
    expect(usableFilters(shopFilters, { storefront: false })).toEqual({
      ...shopFilters,
      chip: '',
      shop: false,
    });
    const off = parseServiceFilters(params('chip=off'));
    expect(usableFilters(off, { storefront: false })).toEqual(off);
  });
});

describe('page and sort', () => {
  it('reads the page, falling back to 1', () => {
    expect(parsePage(params('page=3'))).toBe(3);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=abc'))).toBe(1);
  });

  it('reads only the sorts the server offers, the shop price among them, A to Z by default', () => {
    expect(parseSort(params(''))).toEqual(DEFAULT_SORT);
    expect(parseSort(params('sort=basePrice&dir=desc'))).toEqual({ field: 'basePrice', order: 'desc' });
    expect(parseSort(params('sort=retailPrice'))).toEqual({ field: 'retailPrice', order: 'asc' });
    expect(parseSort(params('sort=margin&dir=desc'))).toEqual(DEFAULT_SORT);
  });

  it('writes the page and sort, leaving the first page and the default sort out', () => {
    expect(writeView(params('page=2'), { page: 1 }).toString()).toBe('');
    expect(writeView(params(''), { page: 2 }).toString()).toBe('page=2');
    expect(writeView(params('sort=cost&dir=desc'), { sort: DEFAULT_SORT }).toString()).toBe('');
    expect(writeView(params(''), { sort: { field: 'cost', order: 'desc' } }).toString()).toBe(
      'sort=cost&dir=desc',
    );
  });
});

describe('the API filters', () => {
  it('trim the search, turn ids into numbers and leave out what is off', () => {
    const filters = parseServiceFilters(
      params('q=%20unlock%20&type=imei&categoryId=4&supplierId=2&belowFloor=true&shop=on'),
    );
    expect(toListFilters(filters)).toEqual({
      q: 'unlock',
      type: 'imei',
      categoryId: 4,
      supplierId: 2,
      belowFloor: true,
      isListed: true,
    });
    expect(toListFilters(parseServiceFilters(params('')))).toEqual({});
  });

  it('ask the server for each chip’s list', () => {
    const chip = (text: string) => toListFilters(parseServiceFilters(params(text)));
    expect(chip('chip=attention')).toEqual({ needsAttention: true });
    expect(chip('chip=notonshop')).toEqual({ notOnShop: true });
    expect(chip('chip=off')).toEqual({ status: 'disabled' });
  });

  it('become a list query, with the search apart from the field filters', () => {
    expect(toListQuery({ q: 'a', belowFloor: true, status: 'active' }, { start: 0, end: 1 })).toEqual({
      start: 0,
      end: 1,
      q: 'a',
      filters: { belowFloor: true, status: 'active' },
    });
  });
});
