// Tests for the page's address parameters: tab, sub-filters, page and sort.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SORT,
  parsePage,
  parseSort,
  parseView,
  refundsPath,
  writePage,
  writeSort,
  writeTab,
  writeView,
} from './view';

const params = (text: string) => new URLSearchParams(text);

describe('parseView', () => {
  it('reads an empty address as the Refunds tab with no sub-filter', () => {
    expect(parseView(params(''))).toEqual({ tab: 'refunds', status: '', method: '' });
  });

  it('reads the tab and both sub-filters', () => {
    expect(parseView(params('tab=payments&method=crypto&status=failed'))).toEqual({
      tab: 'payments',
      status: 'failed',
      method: 'crypto',
    });
  });

  it('drops values it does not know', () => {
    expect(parseView(params('tab=nope&status=paid&method=cash'))).toEqual({
      tab: 'refunds',
      status: '',
      method: '',
    });
  });

  it('reads the long forms the palette and the dashboard link with', () => {
    expect(parseView(params('tab=refunds&status=requested'))).toMatchObject({
      tab: 'refunds',
      status: 'requested',
    });
    expect(parseView(params('tab=disputes')).tab).toBe('disputes');
  });
});

describe('writeView and writeTab', () => {
  it('leaves defaults out and keeps everything else in the address', () => {
    expect(writeView(params('tab=refunds&order=7&page=2'), { status: 'failed' }).toString()).toBe(
      'order=7&page=2&status=failed',
    );
    expect(writeView(params('status=failed'), { status: '' }).toString()).toBe('');
  });

  it('starts a new tab on page 1 with its own sort, keeping the sub-filters', () => {
    const next = writeTab(params('status=failed&page=3&sort=amount&dir=asc&order=9'), 'disputes');
    expect(next.toString()).toBe('status=failed&order=9&tab=disputes');
  });
});

describe('page and sort', () => {
  it('reads the page, with 1 for anything odd', () => {
    expect(parsePage(params('page=4'))).toBe(4);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=x'))).toBe(1);
    expect(parsePage(params(''))).toBe(1);
  });

  it('writes page 1 as no parameter', () => {
    expect(writePage(params('page=3&tab=disputes'), 1).toString()).toBe('tab=disputes');
    expect(writePage(params('tab=disputes'), 2).toString()).toBe('tab=disputes&page=2');
  });

  it('starts each tab on its own sort', () => {
    expect(parseSort(params(''))).toEqual(DEFAULT_SORT.refunds);
    expect(parseSort(params('tab=disputes'))).toEqual({ field: 'evidenceDueAt', order: 'asc' });
    expect(parseSort(params('tab=payments'))).toEqual({ field: 'createdAt', order: 'desc' });
  });

  it('reads a sort the server can do and ignores a column it cannot', () => {
    expect(parseSort(params('sort=amount&dir=asc'))).toEqual({ field: 'amount', order: 'asc' });
    expect(parseSort(params('sort=amount'))).toEqual({ field: 'amount', order: 'desc' });
    expect(parseSort(params('sort=reason&dir=asc'))).toEqual(DEFAULT_SORT.refunds);
    // `evidenceDueAt` belongs to the disputes table only.
    expect(parseSort(params('sort=evidenceDueAt'), 'refunds')).toEqual(DEFAULT_SORT.refunds);
  });

  it('writes a sort back on page 1 and leaves the tab’s own start out', () => {
    expect(writeSort(params('page=3'), { field: 'amount', order: 'desc' }).toString()).toBe(
      'sort=amount&dir=desc',
    );
    expect(writeSort(params('sort=amount&dir=asc&page=2'), DEFAULT_SORT.refunds).toString()).toBe('');
    expect(
      writeSort(params('tab=disputes&sort=amount'), { field: 'evidenceDueAt', order: 'asc' }).toString(),
    ).toBe('tab=disputes');
  });

  it('uses the tab it is given, not the one in the address', () => {
    expect(writeSort(params(''), DEFAULT_SORT.disputes, 'disputes').toString()).toBe('');
  });
});

describe('refundsPath', () => {
  it('builds the links other pages use', () => {
    expect(refundsPath()).toBe('/refunds');
    expect(refundsPath({ tab: 'disputes' })).toBe('/refunds?tab=disputes');
    expect(refundsPath({ tab: 'refunds', status: 'requested' })).toBe('/refunds?status=requested');
    expect(refundsPath({ status: 'failed' })).toBe('/refunds?status=failed');
  });
});
