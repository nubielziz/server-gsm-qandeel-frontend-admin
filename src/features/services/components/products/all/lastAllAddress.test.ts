// Tests for the address of the All view that is kept for the session: nothing kept goes to the plain list, each kind keeps its own, what is
// kept is read back through the address parser (so damaged data makes no bad link), and a storage that refuses is not an error.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ADDRESS, allLink, type AllAddress } from './allAddress';
import { lastAllLink, rememberAllAddress } from './lastAllAddress';

const KEY = 'gsm-products-all-address';
const FILTERED: AllAddress = { q: 'z3x', group: 6, api: 2, show: 'disabled', page: 3, size: 25 };

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('lastAllLink', () => {
  it('goes to the plain list of the kind when none was seen', () => {
    expect(lastAllLink('imei')).toBe(allLink('imei'));
    expect(lastAllLink('imei')).toBe('/products?view=all&type=imei');
  });

  it('returns to the filters, the page and the page size the list had', () => {
    rememberAllAddress('server', FILTERED);
    expect(lastAllLink('server')).toBe(allLink('server', FILTERED));
    expect(lastAllLink('server')).toBe(
      '/products?view=all&type=server&group=6&q=z3x&api=2&show=disabled&page=3&size=25',
    );
  });

  it('keeps one address for each kind and the last one for a kind', () => {
    rememberAllAddress('server', FILTERED);
    rememberAllAddress('imei', { ...EMPTY_ADDRESS, q: 'unlock' });
    expect(lastAllLink('imei')).toBe('/products?view=all&type=imei&q=unlock');
    expect(lastAllLink('remote')).toBe(allLink('remote'));
    rememberAllAddress('server', { ...FILTERED, page: 1 });
    expect(lastAllLink('server')).toBe(allLink('server', { ...FILTERED, page: 1 }));
    expect(lastAllLink('imei')).toBe('/products?view=all&type=imei&q=unlock');
  });

  it('forgets a filter that was cleared', () => {
    rememberAllAddress('imei', FILTERED);
    rememberAllAddress('imei', EMPTY_ADDRESS);
    expect(lastAllLink('imei')).toBe(allLink('imei'));
  });

  it.each([
    ['not JSON', '{nope'],
    ['an array', '[1,2]'],
    ['a number', '7'],
    ['a kind with no text', '{"imei":5}'],
  ])('goes to the plain list when what was kept is %s', (_name, kept) => {
    sessionStorage.setItem(KEY, kept);
    expect(lastAllLink('imei')).toBe(allLink('imei'));
  });

  it('drops the keys of the kept address that are not valid', () => {
    sessionStorage.setItem(KEY, JSON.stringify({ imei: 'view=all&type=imei&group=abc&page=0&size=7&q=x' }));
    expect(lastAllLink('imei')).toBe('/products?view=all&type=imei&q=x');
  });

  it('works without a storage: nothing is kept and nothing throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => rememberAllAddress('imei', FILTERED)).not.toThrow();
    expect(lastAllLink('imei')).toBe(allLink('imei'));
  });
});
