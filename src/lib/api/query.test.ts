// Tests for the Refine to simple-rest query mapping and its URL serialisation.
import type { CrudFilters } from '@refinedev/core';
import { describe, expect, it } from 'vitest';
import { appendParams, listQueryToParams, toListQuery, toQueryString } from './query';

describe('toListQuery', () => {
  it('turns page and size into _start/_end', () => {
    expect(toListQuery({ pagination: { currentPage: 3, pageSize: 25 } })).toMatchObject({
      start: 50,
      end: 75,
    });
    expect(toListQuery({})).toMatchObject({ start: 0, end: 10 });
  });

  it('sends no range when pagination is off or client-side', () => {
    expect(toListQuery({ pagination: { mode: 'off' } })).not.toHaveProperty('start');
    expect(toListQuery({ pagination: { mode: 'client' } })).not.toHaveProperty('end');
  });

  it('maps sorters to parallel sort and order lists', () => {
    const query = toListQuery({
      sorters: [
        { field: 'createdAt', order: 'desc' },
        { field: 'id', order: 'asc' },
      ],
    });
    expect(query.sort).toEqual(['createdAt', 'id']);
    expect(query.order).toEqual(['desc', 'asc']);
  });

  it('maps operators to field suffixes', () => {
    const filters: CrudFilters = [
      { field: 'status', operator: 'eq', value: 'active' },
      { field: 'status', operator: 'ne', value: 'closed' },
      { field: 'total', operator: 'gte', value: 10 },
      { field: 'total', operator: 'lte', value: 99 },
      { field: 'age', operator: 'gt', value: 1 },
      { field: 'age', operator: 'lt', value: 9 },
      { field: 'name', operator: 'contains', value: 'ann' },
    ];
    expect(toListQuery({ filters, pagination: { mode: 'off' } }).filters).toEqual({
      status: 'active',
      status_ne: 'closed',
      total_gte: 10,
      total_lte: 99,
      age_gt: 1,
      age_lt: 9,
      name_like: 'ann',
    });
  });

  it('repeats the key for "in" and merges filters on the same field', () => {
    const filters: CrudFilters = [
      { field: 'id', operator: 'in', value: [1, 2, 3] },
      { field: 'status', operator: 'eq', value: 'a' },
      { field: 'status', operator: 'eq', value: 'b' },
    ];
    expect(toListQuery({ filters }).filters).toEqual({ id: [1, 2, 3], status: ['a', 'b'] });
  });

  it('passes the q field through as the search text', () => {
    const query = toListQuery({ filters: [{ field: 'q', operator: 'contains', value: 'rami' }] });
    expect(query.q).toBe('rami');
    expect(query.filters).toBeUndefined();
  });

  it('drops empty filter values and converts dates', () => {
    const when = new Date('2026-03-01T10:00:00.000Z');
    const query = toListQuery({
      filters: [
        { field: 'status', operator: 'eq', value: '' },
        { field: 'owner', operator: 'eq', value: undefined },
        { field: 'createdAt', operator: 'gte', value: when },
      ],
    });
    expect(query.filters).toEqual({ createdAt_gte: '2026-03-01T10:00:00.000Z' });
  });

  it('throws a clear error for or/and groups and unknown operators', () => {
    const grouped: CrudFilters = [{ operator: 'or', value: [{ field: 'a', operator: 'eq', value: 1 }] }];
    expect(() => toListQuery({ filters: grouped })).toThrow(/"or" is not supported/);
    expect(() => toListQuery({ filters: [{ field: 'a', operator: 'between', value: [1, 2] }] })).toThrow(
      /"between" on "a" is not supported/,
    );
  });
});

describe('listQueryToParams', () => {
  it('writes the simple-rest keys with comma-joined sort lists', () => {
    const params = listQueryToParams({
      start: 20,
      end: 40,
      sort: ['createdAt', 'id'],
      order: ['desc', 'asc'],
      q: 'x',
      filters: { status: ['a', 'b'], active: true, empty: undefined },
    });
    expect(params.get('_start')).toBe('20');
    expect(params.get('_end')).toBe('40');
    expect(params.get('_sort')).toBe('createdAt,id');
    expect(params.get('_order')).toBe('desc,asc');
    expect(params.get('q')).toBe('x');
    expect(params.getAll('status')).toEqual(['a', 'b']);
    expect(params.get('active')).toBe('true');
    expect(params.has('empty')).toBe(false);
  });

  it('merges extra filters, which win over the query filters', () => {
    const params = listQueryToParams({ filters: { status: 'a', kind: 'x' } }, { status: 'b' });
    expect(params.getAll('status')).toEqual(['b']);
    expect(params.get('kind')).toBe('x');
  });

  it('is empty for an empty query', () => {
    expect(listQueryToParams().toString()).toBe('');
  });
});

describe('appendParams / toQueryString', () => {
  it('repeats arrays and skips undefined, null and empty strings', () => {
    const qs = toQueryString({ a: [1, 2], b: undefined, c: null, d: '', e: false, f: 0, g: 'x y' });
    expect(qs).toBe('a=1&a=2&e=false&f=0&g=x+y');
  });

  it('adds to an existing URLSearchParams', () => {
    const params = appendParams(new URLSearchParams('a=1'), { b: 2 });
    expect(params.toString()).toBe('a=1&b=2');
  });
});
