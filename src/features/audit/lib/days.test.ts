// Tests for the day headings and the grouping of the list.
import { describe, expect, it } from 'vitest';
import { fmtDay } from '@/lib/format';
import type { AuditLog } from '../types';
import { dayLabel, groupByDay } from './days';

// Local noon of a day, so the tests do not depend on the machine’s time zone.
const noon = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12).getTime();
const NOW = noon(2026, 3, 5);

const entry = (id: number, createdAt: number): AuditLog => ({
  id,
  actorType: 'staff',
  actorId: 1,
  action: 'did',
  entityType: 'order',
  entityId: id,
  ip: null,
  createdAt: new Date(createdAt).toISOString(),
});

describe('dayLabel', () => {
  it('says Today and Yesterday, then the weekday and date', () => {
    expect(dayLabel(new Date(2026, 2, 5, 0, 5).getTime(), NOW)).toBe('Today');
    expect(dayLabel(noon(2026, 3, 4), NOW)).toBe('Yesterday');
    expect(dayLabel(noon(2026, 3, 2), NOW)).toBe(fmtDay(noon(2026, 3, 2)));
  });

  it('accepts the ISO text of the API', () => {
    expect(dayLabel(new Date(noon(2026, 3, 5)).toISOString(), NOW)).toBe('Today');
  });

  it('says nothing for a date it cannot read', () => {
    expect(dayLabel('not a date', NOW)).toBe('');
  });
});

describe('groupByDay', () => {
  it('starts a group when the day changes and keeps the order', () => {
    const rows = [
      entry(4, noon(2026, 3, 5)),
      entry(3, noon(2026, 3, 5) - 3_600_000),
      entry(2, noon(2026, 3, 4)),
      entry(1, noon(2026, 3, 1)),
    ];
    const groups = groupByDay(rows, NOW);
    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday', fmtDay(noon(2026, 3, 1))]);
    expect(groups.map((group) => group.rows.map((row) => row.id))).toEqual([[4, 3], [2], [1]]);
  });

  it('gives no groups for no rows', () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});
