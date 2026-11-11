// Tests for the schedule dialog's time: the datetime-local value, its ISO conversion in the local zone, the bounds and the hints.
import { describe, expect, it } from 'vitest';
import {
  maxLocalValue,
  minLocalValue,
  scheduleHint,
  timeZoneLabel,
  toLocalInputValue,
  toScheduledAt,
} from './schedule';

// A local time with no zone suffix: `new Date('2026-11-14T08:00')` is read in the machine's zone, so these tests compare through Date and stay zone-proof.
const NOW = new Date(2026, 10, 10, 9, 0, 0).getTime();

describe('the datetime-local value', () => {
  it('writes a moment in local time without a zone', () => {
    expect(toLocalInputValue(new Date(2026, 10, 14, 8, 5))).toBe('2026-11-14T08:05');
  });

  it('turns the local value into the ISO string the API takes', () => {
    const at = toScheduledAt('2026-11-14T08:00');
    expect(at).toBe(new Date(2026, 10, 14, 8, 0).toISOString());
    expect(at).toMatch(/^2026-11-1[34]T\d\d:00:00\.000Z$/);
  });

  it('gives null for an empty or unreadable value', () => {
    expect(toScheduledAt('')).toBeNull();
    expect(toScheduledAt('not a date')).toBeNull();
  });

  it('offers a minimum of two minutes ahead and a maximum of 90 days', () => {
    expect(minLocalValue(NOW)).toBe('2026-11-10T09:02');
    expect(maxLocalValue(NOW)).toBe('2027-02-08T09:00');
  });
});

describe('the hint', () => {
  it('asks for a time, then for one at least two minutes and at most 90 days ahead', () => {
    expect(scheduleHint('', NOW)).toBe('Choose a date and time.');
    expect(scheduleHint('2026-11-10T09:01', NOW)).toMatch(/at least 2 minutes/);
    expect(scheduleHint('2026-11-10T09:02', NOW)).toBeUndefined();
    expect(scheduleHint('2027-02-08T09:01', NOW)).toMatch(/at most 90 days/);
    expect(scheduleHint('2027-02-08T09:00', NOW)).toBeUndefined();
  });
});

describe('the time zone', () => {
  it('names the zone with its UTC offset', () => {
    expect(timeZoneLabel(new Date(2026, 10, 14))).toMatch(/\(UTC[+-]\d\d:\d\d\)$/);
  });
});
