// Tests for the last list address: the All view's address is kept for the session, one per strip tab, so "Back to All" and the strip's tabs
// return to the list as it was left; a damaged value, a blocked storage and a tab never seen give the plain list.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_LIST_ADDRESS } from '../list/listAddress';
import { lastListLink, rememberListAddress } from './lastListAddress';

const KEY = 'gsm-accounts-list-address';

afterEach(() => vi.restoreAllMocks());

describe('lastListLink', () => {
  it('is the plain list when nothing was kept', () => {
    expect(lastListLink()).toBe('/accounts');
    expect(lastListLink('merchants')).toBe('/accounts?chip=merchants');
  });

  it('returns to the list as it was last seen: filters, sort, page and size', () => {
    rememberListAddress({
      ...EMPTY_LIST_ADDRESS,
      status: 'suspended',
      q: 'zain',
      sort: 'status',
      dir: 'desc',
      page: 2,
      size: 25,
    });
    expect(lastListLink()).toBe('/accounts?status=suspended&q=zain&sort=status&dir=desc&page=2&size=25');
    expect(lastListLink('all')).toBe(lastListLink());
  });

  it('keeps one address for each strip tab, and "Back to All" goes to the tab seen last', () => {
    rememberListAddress({ ...EMPTY_LIST_ADDRESS, q: 'a' });
    rememberListAddress({ ...EMPTY_LIST_ADDRESS, chip: 'merchants', rank: 3 });
    expect(lastListLink('all')).toBe('/accounts?q=a');
    expect(lastListLink('merchants')).toBe('/accounts?chip=merchants&rank=3');
    expect(lastListLink('guests')).toBe('/accounts?chip=guests');
    expect(lastListLink()).toBe('/accounts?chip=merchants&rank=3');
  });

  it('reads a kept value through the address parser, so a damaged one cannot make a bad link', () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ all: 'chip=vip&status=nope&sort=password&size=3&page=-2&q=ok', last: 'all' }),
    );
    expect(lastListLink()).toBe('/accounts?q=ok');
    sessionStorage.setItem(KEY, '{not json');
    expect(lastListLink()).toBe('/accounts');
    sessionStorage.setItem(KEY, JSON.stringify([1, 2]));
    expect(lastListLink()).toBe('/accounts');
    sessionStorage.setItem(KEY, JSON.stringify({ all: 7, last: 'nope' }));
    expect(lastListLink()).toBe('/accounts');
  });

  it('lets the tab decide the population, whatever the kept query says', () => {
    sessionStorage.setItem(KEY, JSON.stringify({ guests: 'chip=merchants&q=x' }));
    expect(lastListLink('guests')).toBe('/accounts?chip=guests&q=x');
  });

  it('remembers nothing, and says nothing, when the storage refuses', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => rememberListAddress({ ...EMPTY_LIST_ADDRESS, q: 'a' })).not.toThrow();
    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(lastListLink()).toBe('/accounts');
  });
});
