// Tests for buckets.ts: the words, colours and sentences behind the uptime bars.
import { describe, expect, it } from 'vitest';
import type { CheckBucket, CheckStatus } from '../types';
import {
  bucketClass,
  bucketFacts,
  bucketReadout,
  bucketSummary,
  bucketTime,
  bucketWord,
  countBuckets,
} from './buckets';

// Local time parts keep the clock text the same in every time zone.
const start = new Date(2026, 2, 5, 14, 0).toISOString();

function bucket(status: CheckStatus, over: Partial<CheckBucket> = {}): CheckBucket {
  return { start, status, checks: 15, failures: 0, latencyMs: 412, ...over };
}

describe('bucketClass', () => {
  it('colours ok, degraded and down with status dots and draws no data as an outline', () => {
    expect(bucketClass('ok')).toBe('bg-good-dot');
    expect(bucketClass('degraded')).toBe('bg-warn-dot');
    expect(bucketClass('down')).toBe('bg-crit-dot');
    expect(bucketClass('unknown')).toContain('ring-line2');
    expect(bucketClass('unknown')).not.toContain('border');
    expect(bucketClass('unknown')).not.toContain('bg-good-dot');
  });

  it('draws a status it does not know as no data, never as green', () => {
    expect(bucketClass('exploding' as CheckStatus)).toBe(bucketClass('unknown'));
  });
});

describe('bucketWord', () => {
  it('says No data for a bucket where no check ran', () => {
    expect(bucketWord(bucket('unknown'))).toBe('No data');
    expect(bucketWord(bucket('ok'))).toBe('OK');
    expect(bucketWord(bucket('degraded'))).toBe('Degraded');
    expect(bucketWord(bucket('down'))).toBe('Down');
  });
});

describe('counts and summary', () => {
  const buckets = [
    bucket('ok'),
    bucket('ok'),
    bucket('degraded'),
    bucket('down'),
    bucket('unknown', { checks: 0 }),
  ];

  it('counts the buckets of each status', () => {
    expect(countBuckets(buckets)).toEqual({ ok: 2, degraded: 1, down: 1, unknown: 1 });
  });

  it('counts a status it does not know as no data', () => {
    expect(countBuckets([bucket('exploding' as CheckStatus)])).toEqual({
      ok: 0,
      degraded: 0,
      down: 0,
      unknown: 1,
    });
  });

  it('writes the counts in one sentence and leaves out the zeros', () => {
    expect(bucketSummary(buckets)).toBe('2 ok, 1 degraded, 1 down, 1 with no data');
    expect(bucketSummary([bucket('ok'), bucket('ok')])).toBe('2 ok');
    expect(bucketSummary([])).toBe('');
  });
});

describe('time, facts and readout', () => {
  it('writes the start of a bucket, and its end when the length is known', () => {
    expect(bucketTime({ start })).toMatch(/Thu.*Mar.*14:00/);
    expect(bucketTime({ start }, 900)).toMatch(/14:00 to 14:15$/);
  });

  it('lists the failed checks and the p95 time of a bucket that ran', () => {
    expect(bucketFacts(bucket('down', { failures: 3, latencyMs: 6200 }))).toEqual([
      '3 of 15 checks failed',
      'p95 6.2 s',
    ]);
    expect(bucketFacts(bucket('down', { failures: 15, latencyMs: null }))).toEqual([
      '15 of 15 checks failed',
    ]);
  });

  it('says that no check ran for a bucket without data', () => {
    expect(bucketFacts(bucket('unknown', { checks: 0, latencyMs: null }))).toEqual(['No check ran']);
  });

  it('puts the time, the word and the facts in one line for the live region', () => {
    const line = bucketReadout(bucket('down', { failures: 3, latencyMs: 6200 }), 900);
    expect(line).toMatch(/14:00 to 14:15: Down, 3 of 15 checks failed, p95 6\.2 s$/);
  });
});
