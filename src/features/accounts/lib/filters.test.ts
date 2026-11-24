// Tests for the filters of the accounts list and of the data requests: Refine's list filters and the plain list query.
import { describe, expect, it } from 'vitest';
import { toListQuery, toRefineFilters } from './filters';
import { rangeFilters } from './statementRange';

describe('toRefineFilters', () => {
  it('maps a value to an eq filter, an array to an in filter, and leaves out what is empty', () => {
    expect(
      toRefineFilters({
        q: 'zain',
        status: ['active', 'suspended'],
        hasAccount: true,
        country: undefined,
        rankId: [],
      }),
    ).toEqual([
      { field: 'q', operator: 'eq', value: 'zain' },
      { field: 'status', operator: 'in', value: ['active', 'suspended'] },
      { field: 'hasAccount', operator: 'eq', value: true },
    ]);
  });

  it('maps the filters of the data requests too', () => {
    expect(toRefineFilters({ status: 'open', accountId: 7 })).toEqual([
      { field: 'status', operator: 'eq', value: 'open' },
      { field: 'accountId', operator: 'eq', value: 7 },
    ]);
  });
});

describe('toListQuery', () => {
  it('moves the free text to q, keeps the filters, and adds the range', () => {
    expect(toListQuery({ q: 'zain', status: 'active' }, { start: 0, end: 1 })).toEqual({
      start: 0,
      end: 1,
      q: 'zain',
      filters: { status: 'active' },
    });
    expect(toListQuery({ rankKind: 'merchant' })).toEqual({ filters: { rankKind: 'merchant' } });
  });
});

describe('rangeFilters', () => {
  it('writes the two ends of the statement’s range, and leaves out an end that is missing', () => {
    expect(rangeFilters({ from: '2026-11-01T00:00:00.000Z', to: '2026-11-30T23:59:59.999Z' })).toEqual({
      createdAt_gte: '2026-11-01T00:00:00.000Z',
      createdAt_lte: '2026-11-30T23:59:59.999Z',
    });
    expect(rangeFilters({ to: '2026-11-30T23:59:59.999Z' })).toEqual({
      createdAt_lte: '2026-11-30T23:59:59.999Z',
    });
    expect(rangeFilters({})).toEqual({});
  });
});
