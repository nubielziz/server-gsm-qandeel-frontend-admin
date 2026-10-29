// Tests for client-side sorting of the small lists.
import { describe, expect, it } from 'vitest';
import { sortRows, timeValue, type SortValues } from './sort';

type Row = { name: string; n: number };
const rows: Row[] = [
  { name: 'b', n: 2 },
  { name: 'a', n: 2 },
  { name: 'c', n: 1 },
];
const values: SortValues<Row> = { name: (row) => row.name, n: (row) => row.n };

describe('sortRows', () => {
  it('sorts ascending and descending by the picked column', () => {
    expect(sortRows(rows, { field: 'name', order: 'asc' }, values).map((row) => row.name)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(sortRows(rows, { field: 'name', order: 'desc' }, values).map((row) => row.name)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('keeps the order of equal values', () => {
    expect(sortRows(rows, { field: 'n', order: 'asc' }, values).map((row) => row.name)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('returns a copy in the original order without a sort or for an unknown column', () => {
    expect(sortRows(rows, undefined, values)).toEqual(rows);
    expect(sortRows(rows, { field: 'nope', order: 'asc' }, values)).toEqual(rows);
    expect(sortRows(rows, undefined, values)).not.toBe(rows);
  });
});

describe('timeValue', () => {
  it('turns an ISO date into a number and a missing or bad one into 0', () => {
    expect(timeValue('2026-01-01T00:00:00.000Z')).toBe(Date.parse('2026-01-01T00:00:00.000Z'));
    expect(timeValue(null)).toBe(0);
    expect(timeValue(undefined)).toBe(0);
    expect(timeValue('not a date')).toBe(0);
  });
});
