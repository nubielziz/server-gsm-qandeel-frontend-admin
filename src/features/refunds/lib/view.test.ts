// Tests for the refunds views' address parameters: the sub-filters, page and sort (the Money page's `view` key is never touched), and the
// links other pages build with `refundsPath`.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SORT,
  parsePage,
  parseSort,
  parseView,
  refundsPath,
  writePage,
  writeSort,
  writeView,
} from './view';

const params = (text: string) => new URLSearchParams(text);

describe('parseView', () => {
  it('reads an empty address as no sub-filter', () => {
    expect(parseView(params(''))).toEqual({ status: '', method: '' });
  });

  it('reads both sub-filters', () => {
    expect(parseView(params('view=shop-payments&method=crypto&status=failed'))).toEqual({
      status: 'failed',
      method: 'crypto',
    });
  });

  it('drops values it does not know', () => {
    expect(parseView(params('status=paid&method=cash'))).toEqual({ status: '', method: '' });
  });

  it('does not read the old `tab` key: the view is the page’s `view` key', () => {
    expect(parseView(params('tab=payments&status=requested'))).toEqual({ status: 'requested', method: '' });
  });
});

describe('writeView', () => {
  it('leaves defaults out and keeps everything else in the address, the view first among them', () => {
    expect(writeView(params('view=refunds&order=7&page=2'), { status: 'failed' }).toString()).toBe(
      'view=refunds&order=7&page=2&status=failed',
    );
    expect(writeView(params('view=refunds&status=failed'), { status: '' }).toString()).toBe('view=refunds');
  });

  it('keeps the other sub-filter and never writes a tab', () => {
    expect(writeView(params('view=shop-payments&status=failed'), { method: 'card' }).toString()).toBe(
      'view=shop-payments&status=failed&method=card',
    );
  });
});

describe('page and sort', () => {
  it('reads the page, with 1 for anything odd', () => {
    expect(parsePage(params('page=4'))).toBe(4);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=x'))).toBe(1);
    expect(parsePage(params(''))).toBe(1);
  });

  it('writes page 1 as no parameter and keeps the view', () => {
    expect(writePage(params('view=disputes&page=3'), 1).toString()).toBe('view=disputes');
    expect(writePage(params('view=disputes'), 2).toString()).toBe('view=disputes&page=2');
  });

  it('starts each table on its own sort', () => {
    expect(parseSort(params(''), 'refunds')).toEqual(DEFAULT_SORT.refunds);
    expect(parseSort(params('view=disputes'), 'disputes')).toEqual({ field: 'evidenceDueAt', order: 'asc' });
    expect(parseSort(params('view=shop-payments'), 'payments')).toEqual({
      field: 'createdAt',
      order: 'desc',
    });
  });

  it('reads a sort the server can do and ignores a column it cannot', () => {
    expect(parseSort(params('sort=amount&dir=asc'), 'refunds')).toEqual({ field: 'amount', order: 'asc' });
    expect(parseSort(params('sort=amount'), 'refunds')).toEqual({ field: 'amount', order: 'desc' });
    expect(parseSort(params('sort=reason&dir=asc'), 'refunds')).toEqual(DEFAULT_SORT.refunds);
    // `evidenceDueAt` belongs to the disputes table only.
    expect(parseSort(params('sort=evidenceDueAt'), 'refunds')).toEqual(DEFAULT_SORT.refunds);
  });

  it('writes a sort back on page 1 and leaves the table’s own start out, keeping the view', () => {
    expect(
      writeSort(params('view=refunds&page=3'), { field: 'amount', order: 'desc' }, 'refunds').toString(),
    ).toBe('view=refunds&sort=amount&dir=desc');
    expect(
      writeSort(
        params('view=refunds&sort=amount&dir=asc&page=2'),
        DEFAULT_SORT.refunds,
        'refunds',
      ).toString(),
    ).toBe('view=refunds');
    expect(
      writeSort(
        params('view=disputes&sort=amount'),
        { field: 'evidenceDueAt', order: 'asc' },
        'disputes',
      ).toString(),
    ).toBe('view=disputes');
  });

  it('judges the start by the table it is given', () => {
    expect(writeSort(params('view=disputes'), DEFAULT_SORT.disputes, 'disputes').toString()).toBe(
      'view=disputes',
    );
    expect(writeSort(params('view=refunds'), DEFAULT_SORT.disputes, 'refunds').toString()).toBe(
      'view=refunds&sort=evidenceDueAt&dir=asc',
    );
  });
});

describe('refundsPath', () => {
  it('builds the Money addresses other pages link to', () => {
    expect(refundsPath()).toBe('/money?view=refunds');
    expect(refundsPath({ tab: 'disputes' })).toBe('/money?view=disputes');
    expect(refundsPath({ tab: 'payments' })).toBe('/money?view=shop-payments');
    expect(refundsPath({ tab: 'refunds', status: 'requested' })).toBe('/money?view=refunds&status=requested');
    expect(refundsPath({ status: 'failed' })).toBe('/money?view=refunds&status=failed');
    expect(refundsPath({ tab: 'payments', method: 'crypto' })).toBe(
      '/money?view=shop-payments&method=crypto',
    );
  });
});
