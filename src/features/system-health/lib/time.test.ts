// Tests for time.ts: "8s ago" text and the rule that data is stale after two poll intervals.
import { describe, expect, it } from 'vitest';
import { formatAgo, formatInterval, isStale, sinceText } from './time';

describe('formatAgo', () => {
  it('counts seconds, minutes, hours and days', () => {
    expect(formatAgo(0)).toBe('just now');
    expect(formatAgo(2_900)).toBe('just now');
    expect(formatAgo(3_000)).toBe('3s ago');
    expect(formatAgo(8_400)).toBe('8s ago');
    expect(formatAgo(59_000)).toBe('59s ago');
    expect(formatAgo(60_000)).toBe('1m ago');
    expect(formatAgo(125_000)).toBe('2m ago');
    expect(formatAgo(3_600_000)).toBe('1h ago');
    expect(formatAgo(26 * 3_600_000)).toBe('1d ago');
  });

  it('never goes negative when the server clock is ahead', () => {
    expect(formatAgo(-5_000)).toBe('just now');
  });
});

describe('isStale', () => {
  it('is true only after more than two intervals', () => {
    expect(isStale(1_000, 1_000 + 30_000, 15_000)).toBe(false);
    expect(isStale(1_000, 1_000 + 30_001, 15_000)).toBe(true);
    expect(isStale(1_000, 1_000 + 5_000, 15_000)).toBe(false);
  });

  it('is false without a time or without polling', () => {
    expect(isStale(0, 1_000_000, 15_000)).toBe(false);
    expect(isStale(undefined, 1_000_000, 15_000)).toBe(false);
    expect(isStale(1_000, 1_000_000, 0)).toBe(false);
  });
});

describe('formatInterval', () => {
  it('writes the poll interval in words', () => {
    expect(formatInterval(15_000)).toBe('15s');
    expect(formatInterval(30_000)).toBe('30s');
    expect(formatInterval(60_000)).toBe('1m');
  });
});

describe('sinceText', () => {
  // August: no clock change in between in the common time zones, so the elapsed time is the same everywhere.
  const now = new Date(2026, 7, 21, 14, 40, 0).getTime();

  it('gives the time and how long ago, for a start on the same day', () => {
    const start = new Date(2026, 7, 21, 14, 2, 0).toISOString();
    expect(sinceText(start, now)).toBe('since 14:02 (38m)');
  });

  it('adds the date when it began on an earlier day', () => {
    const start = new Date(2026, 7, 12, 8, 14, 0).toISOString();
    // ageText joins the two units with a non-breaking space.
    expect(sinceText(start, now)).toBe('since 12 Aug, 08:14 (9d\u00a06h)');
  });

  it('is empty when the server sent no time or one that cannot be read', () => {
    expect(sinceText(null, now)).toBeNull();
    expect(sinceText(undefined, now)).toBeNull();
    expect(sinceText('not a time', now)).toBeNull();
  });

  it('never prints a negative age for a start slightly in the future', () => {
    const start = new Date(2026, 7, 21, 14, 40, 20).toISOString();
    expect(sinceText(start, now)).toBe('since 14:40 (<1m)');
  });
});
