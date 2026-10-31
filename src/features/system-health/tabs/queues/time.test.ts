// Tests for the time words of the Queues & jobs tab: clock text, how far ahead a run is, how long a run took.
import { describe, expect, it } from 'vitest';
import { clockText, runDurationText, untilText } from './time';

// Local times on purpose: the helpers print in the browser's time zone, so the tests build and read local moments.
const NOW = new Date(2026, 9, 31, 12, 0, 0).getTime();
const local = (month: number, day: number, hour: number, minute: number) =>
  new Date(2026, month, day, hour, minute).toISOString();

describe('clockText', () => {
  it('shows only the time for a moment today', () => {
    expect(clockText(local(9, 31, 14, 30), NOW)).toBe('14:30');
    expect(clockText(local(9, 31, 2, 5), NOW)).toBe('02:05');
  });

  it('adds the day for any other day', () => {
    expect(clockText(local(10, 1, 2, 30), NOW)).toBe('01 Nov, 02:30');
    expect(clockText(local(9, 30, 23, 45), NOW)).toBe('30 Oct, 23:45');
  });

  it('is empty for no time and for one that cannot be read', () => {
    expect(clockText(null, NOW)).toBe('');
    expect(clockText(undefined, NOW)).toBe('');
    expect(clockText('', NOW)).toBe('');
    expect(clockText('not a date', NOW)).toBe('');
  });
});

describe('untilText', () => {
  it('says how far ahead a moment is, in its two largest units', () => {
    expect(untilText(new Date(NOW + 12 * 60_000).toISOString(), NOW)).toBe('in 12m');
    expect(untilText(new Date(NOW + 125 * 60_000).toISOString(), NOW)).toBe('in 2h 5m');
    expect(untilText(new Date(NOW + 20_000).toISOString(), NOW)).toBe('in <1m');
  });

  it('says "due now" once the time has come, without calling it late', () => {
    expect(untilText(new Date(NOW).toISOString(), NOW)).toBe('due now');
    expect(untilText(new Date(NOW - 90_000).toISOString(), NOW)).toBe('due now');
  });

  it('is empty when the server sent no time', () => {
    expect(untilText(null, NOW)).toBe('');
    expect(untilText('garbage', NOW)).toBe('');
  });
});

describe('runDurationText', () => {
  it('prints how long a finished run took, with its unit', () => {
    expect(runDurationText({ status: 'succeeded', durationMs: 21_000 })).toBe('21s');
    expect(runDurationText({ status: 'failed', durationMs: 192_000 })).toBe('3m 12s');
    expect(runDurationText({ status: 'succeeded', durationMs: 400 })).toBe('<1s');
  });

  it('prints nothing for a run that has not ended', () => {
    expect(runDurationText({ status: 'running', durationMs: 0 })).toBe('');
  });
});
