// Tests for whenParts: the clock for today, the date for an earlier day, and how long ago, in the browser's time zone.
import { describe, expect, it } from 'vitest';
import { whenParts } from './when';

// Local-time constructors, so the test holds in any time zone.
const NOW = new Date(2026, 9, 31, 12, 0, 0).getTime();
const at = (month: number, day: number, hour: number, minute: number) =>
  new Date(2026, month, day, hour, minute).toISOString();

describe('whenParts', () => {
  it('gives the clock time and the age for a time today', () => {
    expect(whenParts(at(9, 31, 9, 45), NOW)).toEqual({ when: '09:45', ago: '2h ago' });
    expect(whenParts(at(9, 31, 11, 22), NOW)).toEqual({ when: '11:22', ago: '38m ago' });
  });

  it('adds the date for an earlier day', () => {
    expect(whenParts(at(9, 22, 8, 14), NOW)).toEqual({ when: '22 Oct, 08:14', ago: '9d ago' });
  });

  it('says "just now" for the last moments, and for a time a little ahead of the clock', () => {
    expect(whenParts(new Date(NOW - 10_000).toISOString(), NOW)?.ago).toBe('just now');
    expect(whenParts(new Date(NOW + 60_000).toISOString(), NOW)?.ago).toBe('just now');
  });

  it('is null for a missing or unreadable time, so the caller prints its own words', () => {
    expect(whenParts(null, NOW)).toBeNull();
    expect(whenParts(undefined, NOW)).toBeNull();
    expect(whenParts('', NOW)).toBeNull();
    expect(whenParts('not a date', NOW)).toBeNull();
  });
});
