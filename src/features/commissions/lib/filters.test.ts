// Tests for the accruals address: which status, agent, page and sort it names, how a change is written back, the API filters it
// becomes, and the links to the page.
import { describe, expect, it } from 'vitest';
import {
  commissionsPath,
  DEFAULT_SORT,
  parseAccrualView,
  parsePage,
  parseSort,
  toListFilters,
  toRefineFilters,
  writeAccrualView,
  writeView,
} from './filters';

const params = (query: string) => new URLSearchParams(query);

describe('parseAccrualView', () => {
  it('opens on the ready accruals of every agent', () => {
    expect(parseAccrualView(params(''))).toEqual({ status: 'accrued', agent: null });
  });

  it('reads the status and the agent', () => {
    expect(parseAccrualView(params('status=approved&agent=5'))).toEqual({ status: 'approved', agent: 5 });
    expect(parseAccrualView(params('status=all'))).toEqual({ status: 'all', agent: null });
  });

  it('drops a status it does not know and an agent that is not a number', () => {
    expect(parseAccrualView(params('status=paid&agent=abc'))).toEqual({ status: 'accrued', agent: null });
    expect(parseAccrualView(params('agent=0'))).toEqual({ status: 'accrued', agent: null });
  });
});

describe('writeAccrualView', () => {
  it('leaves the defaults out and keeps everything else in the address', () => {
    const next = writeAccrualView(params('status=approved&agent=5&page=3'), {
      status: 'accrued',
      agent: null,
    });
    expect(next.toString()).toBe('page=3');
  });

  it('writes a change over the rest of the filters', () => {
    expect(writeAccrualView(params('agent=5'), { status: 'all' }).toString()).toBe('agent=5&status=all');
  });
});

describe('page and sort', () => {
  it('reads the page, 1 when it is missing or wrong', () => {
    expect(parsePage(params('page=4'))).toBe(4);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=x'))).toBe(1);
  });

  it('reads the sort the server can do, newest first when the address names none', () => {
    expect(parseSort(params(''))).toEqual(DEFAULT_SORT);
    expect(parseSort(params('sort=amount&dir=asc'))).toEqual({ field: 'amount', order: 'asc' });
    expect(parseSort(params('sort=amount'))).toEqual({ field: 'amount', order: 'desc' });
    expect(parseSort(params('sort=beneficiary'))).toEqual(DEFAULT_SORT);
  });

  it('writes the page and sort, leaving the first page and the default sort out', () => {
    expect(writeView(params('page=3'), { page: 1 }).toString()).toBe('');
    expect(writeView(params(''), { page: 2, sort: { field: 'amount', order: 'asc' } }).toString()).toBe(
      'page=2&sort=amount&dir=asc',
    );
    expect(writeView(params('sort=amount&dir=asc'), { sort: DEFAULT_SORT }).toString()).toBe('');
  });
});

describe('toListFilters', () => {
  it('sends the status and the agent, and nothing for All and every agent', () => {
    expect(toListFilters({ status: 'accrued', agent: null })).toEqual({ status: 'accrued' });
    expect(toListFilters({ status: 'all', agent: null })).toEqual({});
    expect(toListFilters({ status: 'approved', agent: 5 })).toEqual({ status: 'approved', beneficiaryId: 5 });
  });

  it('becomes Refine filters, one equals test per field', () => {
    expect(toRefineFilters({ status: 'accrued', beneficiaryId: 5 })).toEqual([
      { field: 'status', operator: 'eq', value: 'accrued' },
      { field: 'beneficiaryId', operator: 'eq', value: 5 },
    ]);
  });
});

describe('commissionsPath', () => {
  it('is the bare page for the default view', () => {
    expect(commissionsPath()).toBe('/commissions');
    expect(commissionsPath({ tab: 'accruals', status: 'accrued' })).toBe('/commissions');
  });

  it('names a tab, a status and an agent', () => {
    expect(commissionsPath({ tab: 'plans' })).toBe('/commissions?tab=plans');
    expect(commissionsPath({ agent: 5 })).toBe('/commissions?agent=5');
    expect(commissionsPath({ status: 'approved', agent: 5 })).toBe('/commissions?status=approved&agent=5');
  });
});
