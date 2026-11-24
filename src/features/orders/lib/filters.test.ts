// Tests for the list's address parameters and for the API filters built from them.
import { describe, expect, it } from 'vitest';
import {
  clearOrderFilters,
  defaultSort,
  hasActiveFilters,
  NEWEST_FIRST,
  normalizeSearch,
  ordersListPath,
  parseOrderFilters,
  parsePage,
  parseSort,
  toListFilters,
  toListQuery,
  toRefineFilters,
  writeOrderFilters,
  writeView,
} from './filters';

const params = (text: string) => new URLSearchParams(text);

describe('parseOrderFilters', () => {
  it('reads an empty address as the Open tab, no filter (the demo opens on what is waiting)', () => {
    expect(parseOrderFilters(params(''))).toEqual({
      tab: 'open',
      q: '',
      type: '',
      supplierId: '',
      accountId: '',
      rankId: '',
      channel: '',
      pastSla: false,
    });
  });

  it('reads every filter', () => {
    expect(
      parseOrderFilters(
        params('tab=review&q=48100&type=imei&supplierId=3&accountId=7&rankId=2&channel=b2c&pastSla=true'),
      ),
    ).toEqual({
      tab: 'review',
      q: '48100',
      type: 'imei',
      supplierId: '3',
      accountId: '7',
      rankId: '2',
      channel: 'b2c',
      pastSla: true,
    });
  });

  it('reads an address saved with clientId as the same account (a merchant number is an account number)', () => {
    expect(parseOrderFilters(params('clientId=7')).accountId).toBe('7');
    expect(parseOrderFilters(params('accountId=9&clientId=7')).accountId).toBe('9');
  });

  it('ignores customerId: the old customer number would name another account', () => {
    expect(parseOrderFilters(params('customerId=7')).accountId).toBe('');
  });

  it('drops values it does not know', () => {
    expect(parseOrderFilters(params('tab=everything&type=sim&supplierId=abc&channel=b2x&pastSla=1'))).toEqual(
      parseOrderFilters(params('')),
    );
  });
});

describe('writeOrderFilters', () => {
  it('leaves the defaults out of the address', () => {
    expect(writeOrderFilters(params('tab=review'), { tab: 'open' }).toString()).toBe('');
    expect(writeOrderFilters(params(''), { tab: 'all' }).get('tab')).toBe('all');
  });

  it('changes one filter and keeps everything else, including the open order', () => {
    const next = writeOrderFilters(params('tab=review&order=48100&q=abc'), { type: 'server', q: '' });
    expect(next.get('tab')).toBe('review');
    expect(next.get('order')).toBe('48100');
    expect(next.get('type')).toBe('server');
    expect(next.has('q')).toBe(false);
  });

  it('writes the past SLA chip as pastSla=true', () => {
    expect(writeOrderFilters(params(''), { pastSla: true }).get('pastSla')).toBe('true');
  });

  it('writes the buyer as accountId and the rank as rankId, and drops the old key', () => {
    const next = writeOrderFilters(params('clientId=7&tab=all'), { rankId: '2' });
    expect(next.get('accountId')).toBe('7');
    expect(next.get('rankId')).toBe('2');
    expect(next.has('clientId')).toBe(false);
    expect(writeOrderFilters(next, { accountId: '', rankId: '' }).toString()).toBe('tab=all');
  });
});

describe('clearOrderFilters', () => {
  it('removes the toolbar filters and the page, and keeps the tab and the open order', () => {
    const next = clearOrderFilters(
      params('tab=review&q=x&type=imei&accountId=7&rankId=2&clientId=7&pastSla=true&page=3&order=9'),
    );
    expect(next.toString()).toBe('tab=review&order=9');
  });
});

describe('hasActiveFilters', () => {
  it('ignores the tab and counts every toolbar filter', () => {
    expect(hasActiveFilters(parseOrderFilters(params('tab=review')))).toBe(false);
    expect(hasActiveFilters(parseOrderFilters(params('q=abc')))).toBe(true);
    expect(hasActiveFilters(parseOrderFilters(params('pastSla=true')))).toBe(true);
    expect(hasActiveFilters(parseOrderFilters(params('channel=b2b')))).toBe(true);
    expect(hasActiveFilters(parseOrderFilters(params('accountId=7')))).toBe(true);
    expect(hasActiveFilters(parseOrderFilters(params('rankId=2')))).toBe(true);
    expect(hasActiveFilters(parseOrderFilters(params('q=%20%20')))).toBe(false);
  });
});

describe('page and sort', () => {
  it('read the page and the sort', () => {
    expect(parsePage(params('page=3'))).toBe(3);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=x'))).toBe(1);
    expect(parseSort(params('sort=totalPrice&dir=asc'))).toEqual({ field: 'totalPrice', order: 'asc' });
    expect(parseSort(params('sort=totalPrice'))).toEqual({ field: 'totalPrice', order: 'desc' });
  });

  it('start the tabs that list the queue with the oldest order and the others with the newest', () => {
    expect(defaultSort('open')).toEqual({ field: 'createdAt', order: 'asc' });
    expect(defaultSort('review')).toEqual({ field: 'createdAt', order: 'asc' });
    expect(defaultSort('queued')).toEqual({ field: 'createdAt', order: 'asc' });
    expect(defaultSort('processing')).toEqual({ field: 'createdAt', order: 'asc' });
    expect(defaultSort('completed')).toEqual({ field: 'createdAt', order: 'desc' });
    expect(defaultSort('rejected')).toEqual({ field: 'createdAt', order: 'desc' });
    expect(defaultSort('all')).toEqual(NEWEST_FIRST);
    expect(parseSort(params(''))).toEqual(defaultSort('open'));
    expect(parseSort(params('tab=all'))).toEqual(NEWEST_FIRST);
    expect(parseSort(params('sort=profit'))).toEqual(defaultSort('open'));
  });

  it('write the page, leaving page 1 out', () => {
    expect(writeView(params(''), { page: 2 }).get('page')).toBe('2');
    expect(writeView(params('page=2'), { page: 1 }).has('page')).toBe(false);
  });

  it('write a sort, leaving out the one the tab starts with', () => {
    const sorted = writeView(params(''), { sort: { field: 'totalPrice', order: 'asc' } });
    expect(sorted.get('sort')).toBe('totalPrice');
    expect(sorted.get('dir')).toBe('asc');
    // Oldest first is the Open tab's own order, so it needs no parameter there; on All it is a choice.
    expect(writeView(sorted, { sort: { field: 'createdAt', order: 'asc' } }).toString()).toBe('');
    expect(writeView(params('tab=all'), { sort: { field: 'createdAt', order: 'asc' } }).get('dir')).toBe(
      'asc',
    );
    expect(writeView(params('tab=all&sort=totalPrice&dir=asc'), { sort: NEWEST_FIRST }).toString()).toBe(
      'tab=all',
    );
  });
});

describe('normalizeSearch', () => {
  it('drops the prefix of an order id the demo showed', () => {
    expect(normalizeSearch('ORD-48100')).toBe('48100');
    expect(normalizeSearch(' sf-20490 ')).toBe('20490');
    expect(normalizeSearch('#48100')).toBe('48100');
  });

  it('keeps any other text, trimmed', () => {
    expect(normalizeSearch('  35 389011  ')).toBe('35 389011');
    expect(normalizeSearch('ORD-ABC')).toBe('ORD-ABC');
  });
});

describe('to the API', () => {
  const filters = parseOrderFilters(
    params('tab=open&q=ORD-48100&type=imei&supplierId=3&accountId=7&rankId=2&channel=b2b&pastSla=true'),
  );

  it('combines the tab and the toolbar, with ids as numbers', () => {
    expect(toListFilters(filters)).toEqual({
      status: ['pending', 'processing'],
      q: '48100',
      type: 'imei',
      supplierId: 3,
      accountId: 7,
      rankId: 2,
      channel: 'b2b',
      pastSla: true,
    });
  });

  it('lets a fixed filter win and add (an account’s page)', () => {
    expect(toListFilters(parseOrderFilters(params('tab=all')), { accountId: 9 })).toEqual({ accountId: 9 });
    expect(toListFilters(filters, { accountId: 9 }).accountId).toBe(9);
  });

  it('never sends the old buyer keys', () => {
    const sent = toListFilters(parseOrderFilters(params('clientId=7&customerId=8')));
    expect(sent).toEqual({ status: ['pending', 'processing'], accountId: 7 });
    expect(sent).not.toHaveProperty('clientId');
    expect(sent).not.toHaveProperty('customerId');
  });

  it('becomes Refine filters: arrays use "in", the rest "eq"', () => {
    expect(
      toRefineFilters({
        status: ['pending', 'processing'],
        q: 'abc',
        pastSla: true,
        accountId: 7,
        rankId: 2,
      }),
    ).toEqual([
      { field: 'status', operator: 'in', value: ['pending', 'processing'] },
      { field: 'q', operator: 'eq', value: 'abc' },
      { field: 'pastSla', operator: 'eq', value: true },
      { field: 'accountId', operator: 'eq', value: 7 },
      { field: 'rankId', operator: 'eq', value: 2 },
    ]);
  });

  it('becomes a list query for the counts and the export', () => {
    expect(toListQuery({ queue: 'pending', q: 'abc' }, { start: 0, end: 1 })).toEqual({
      start: 0,
      end: 1,
      q: 'abc',
      filters: { queue: 'pending' },
    });
  });
});

describe('ordersListPath', () => {
  it('writes only the filters that differ from the defaults', () => {
    expect(ordersListPath({})).toBe('/orders');
    expect(ordersListPath({ tab: 'open' })).toBe('/orders');
    expect(ordersListPath({ tab: 'review' })).toBe('/orders?tab=review');
    expect(ordersListPath({ type: 'imei', channel: 'b2c', pastSla: true })).toBe(
      '/orders?type=imei&channel=b2c&pastSla=true',
    );
  });
});
