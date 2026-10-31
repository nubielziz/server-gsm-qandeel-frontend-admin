// Tests for the pure helpers of the Data stores tab: meter tone, bar ratio, problems-first order, empty-list lines and text.
import { describe, expect, it } from 'vitest';
import type { MetricState } from '../../types';
import {
  emptyListNote,
  figureState,
  foldHealthy,
  growthText,
  isUnreadable,
  isUnreadZero,
  longestFirst,
  meterTone,
  problemsFirst,
  sentenceCase,
  settledStatus,
  storeOrder,
  usageRatio,
} from './storeFigures';

describe('figureState', () => {
  const reading = (value: number | null, state: MetricState) => ({ value, state });

  it('is the server state while there is a number', () => {
    for (const state of ['ok', 'warn', 'crit', 'unknown'] as const) {
      expect(figureState(reading(12, state))).toBe(state);
    }
  });

  it('keeps a zero as a reading', () => {
    expect(figureState(reading(0, 'ok'))).toBe('ok');
  });

  it('is unknown for a missing number, whatever state came with it, so no data is never OK', () => {
    expect(figureState(reading(null, 'ok'))).toBe('unknown');
    expect(figureState(reading(null, 'warn'))).toBe('unknown');
    expect(figureState(reading(null, 'unknown'))).toBe('unknown');
  });
});

describe('meterTone', () => {
  it('maps the server state to a tone and leaves a healthy or missing reading neutral', () => {
    expect(meterTone('ok')).toBe('neutral');
    expect(meterTone('unknown')).toBe('neutral');
    expect(meterTone('warn')).toBe('warn');
    expect(meterTone('crit')).toBe('crit');
  });
});

describe('usageRatio', () => {
  it('is used over the limit', () => {
    expect(usageRatio(38, 100)).toBe(0.38);
    expect(usageRatio(412, 2048)).toBeCloseTo(0.2012, 3);
  });

  it('draws an empty bar when there is no limit, a zero limit or no number', () => {
    expect(usageRatio(5, null)).toBe(0);
    expect(usageRatio(5, 0)).toBe(0);
    expect(usageRatio(Number.NaN, 100)).toBe(0);
    expect(usageRatio(5, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('does not clamp; the meter does that', () => {
    expect(usageRatio(120, 100)).toBe(1.2);
  });
});

describe('problemsFirst', () => {
  const figure = (key: string, state: 'ok' | 'warn' | 'crit' | 'unknown' | null) => ({ key, state });

  it('puts critical, then warning, then no data in front, and keeps the written order of the rest', () => {
    const sorted = problemsFirst([
      figure('a', 'ok'),
      figure('b', null),
      figure('c', 'unknown'),
      figure('d', 'warn'),
      figure('e', 'crit'),
      figure('f', 'ok'),
    ]);
    expect(sorted.map((f) => f.key)).toEqual(['e', 'd', 'c', 'a', 'b', 'f']);
  });

  it('does not change the list it is given', () => {
    const input = [figure('a', 'ok'), figure('b', 'crit')];
    problemsFirst(input);
    expect(input.map((f) => f.key)).toEqual(['a', 'b']);
  });
});

describe('foldHealthy', () => {
  const figure = (key: string, state: 'ok' | 'warn' | 'crit' | 'unknown' | null) => ({ key, state });

  it('folds nothing while every figure is fine, so a healthy card shows all its figures', () => {
    const all = [figure('a', 'ok'), figure('b', null), figure('c', 'ok')];
    const { shown, folded } = foldHealthy(all);
    expect(shown.map((f) => f.key)).toEqual(['a', 'b', 'c']);
    expect(folded).toEqual([]);
  });

  it('folds the OK measures once one is warning, critical or without data', () => {
    for (const bad of ['warn', 'crit', 'unknown'] as const) {
      const { shown, folded } = foldHealthy([figure('bad', bad), figure('a', 'ok'), figure('b', 'ok')]);
      expect(shown.map((f) => f.key)).toEqual(['bad']);
      expect(folded.map((f) => f.key)).toEqual(['a', 'b']);
    }
  });

  it('never folds a plain fact: it has no server state, so it is not called fine', () => {
    const { shown, folded } = foldHealthy([figure('bad', 'crit'), figure('count', null), figure('a', 'ok')]);
    expect(shown.map((f) => f.key)).toEqual(['bad', 'count']);
    expect(folded.map((f) => f.key)).toEqual(['a']);
  });

  it('folds nothing when there is nothing but problems and plain facts', () => {
    const { folded } = foldHealthy([figure('bad', 'warn'), figure('count', null)]);
    expect(folded).toEqual([]);
  });
});

describe('storeOrder', () => {
  it('keeps Postgres first when both are alike or fine', () => {
    expect(storeOrder('ok', 'ok')).toEqual(['database', 'cache']);
    expect(storeOrder('down', 'down')).toEqual(['database', 'cache']);
    expect(storeOrder('down', 'ok')).toEqual(['database', 'cache']);
  });

  it('puts Redis first only when its status is worse', () => {
    expect(storeOrder('ok', 'down')).toEqual(['cache', 'database']);
    expect(storeOrder('ok', 'degraded')).toEqual(['cache', 'database']);
    expect(storeOrder('degraded', 'down')).toEqual(['cache', 'database']);
  });

  it('does not reorder while either status is not known yet', () => {
    expect(storeOrder(null, 'down')).toEqual(['database', 'cache']);
    expect(storeOrder('ok', null)).toEqual(['database', 'cache']);
  });

  it('counts an unknown status as a problem', () => {
    expect(storeOrder('ok', 'unknown')).toEqual(['cache', 'database']);
  });
});

describe('settledStatus', () => {
  it('is the status of the answer', () => {
    expect(settledStatus({ data: { status: 'degraded' }, isError: false })).toBe('degraded');
  });

  it('keeps the last answer even when the latest refresh failed', () => {
    expect(settledStatus({ data: { status: 'ok' }, isError: true })).toBe('ok');
  });

  it('is unknown when the read failed without any answer, and null while it is still loading', () => {
    expect(settledStatus({ data: undefined, isError: true })).toBe('unknown');
    expect(settledStatus({ data: undefined, isError: false })).toBeNull();
  });
});

describe('isUnreadZero', () => {
  it('is true for a zero from a store that is down or unknown, which says nothing', () => {
    expect(isUnreadZero(0, 'down')).toBe(true);
    expect(isUnreadZero(0, 'unknown')).toBe(true);
  });

  it('is false for a zero from a store that is up: that is a real zero', () => {
    expect(isUnreadZero(0, 'ok')).toBe(false);
    expect(isUnreadZero(0, 'degraded')).toBe(false);
  });

  it('is false for a count above zero, from any store: it is data and prints as sent', () => {
    expect(isUnreadZero(3, 'down')).toBe(false);
    expect(isUnreadZero(184, 'unknown')).toBe(false);
  });
});

describe('isUnreadable and emptyListNote', () => {
  it('treats down and unknown as unreadable', () => {
    expect(isUnreadable('down')).toBe(true);
    expect(isUnreadable('unknown')).toBe(true);
    expect(isUnreadable('ok')).toBe(false);
    expect(isUnreadable('degraded')).toBe(false);
  });

  it('says there is nothing to list when the store is up', () => {
    expect(emptyListNote('ok', 'slow queries')).toBe('No slow queries.');
    expect(emptyListNote('degraded', 'long transactions')).toBe('No long transactions.');
  });

  it('says the list could not be read when the store is down or unknown, never "no slow queries"', () => {
    expect(emptyListNote('down', 'slow queries')).toBe('Postgres is down, so slow queries cannot be read.');
    expect(emptyListNote('unknown', 'long transactions')).toBe(
      'The status of Postgres is unknown, so long transactions cannot be read.',
    );
  });
});

describe('growthText', () => {
  const MB = 1024 * 1024;

  it('prints growth per day with a plus sign', () => {
    expect(growthText(310 * MB)).toBe('+310 MB/day');
  });

  it('prints a shrinking database with its minus and no growth as zero', () => {
    expect(growthText(-5 * MB)).toBe('-5 MB/day');
    expect(growthText(0)).toBe('0 B/day');
  });

  it('says there is no data for a growth that is not measured, never zero', () => {
    expect(growthText(null)).toBe('No growth data');
    expect(growthText(Number.NaN)).toBe('No growth data');
  });
});

describe('longestFirst', () => {
  it('orders by how long the transaction has been open, without changing the input', () => {
    const rows = [
      { pid: 1, durationSeconds: 60 },
      { pid: 2, durationSeconds: 900 },
      { pid: 3, durationSeconds: 300 },
    ];
    expect(longestFirst(rows).map((r) => r.pid)).toEqual([2, 3, 1]);
    expect(rows.map((r) => r.pid)).toEqual([1, 2, 3]);
  });
});

describe('sentenceCase', () => {
  it('capitalizes the first letter only', () => {
    expect(sentenceCase('idle in transaction')).toBe('Idle in transaction');
    expect(sentenceCase('active')).toBe('Active');
    expect(sentenceCase('')).toBe('');
  });
});
