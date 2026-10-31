// Tests for measure.ts: every unit prints with its unit, null prints "No data", thresholds print what the server sent.
import { describe, expect, it } from 'vitest';
import type { MeasureUnit, MetricState } from '../types';
import {
  NO_DATA,
  compareStates,
  formatBytes,
  formatDuration,
  formatMeasure,
  formatValue,
  plainNumber,
  stateMeta,
  thresholdText,
} from './measure';

describe('formatValue', () => {
  it('prints milliseconds under a second and seconds from there', () => {
    expect(formatValue(412, 'ms')).toBe('412 ms');
    expect(formatValue(800, 'ms')).toBe('800 ms');
    expect(formatValue(0, 'ms')).toBe('0 ms');
    expect(formatValue(8.4, 'ms')).toBe('8.4 ms');
    expect(formatValue(1240, 'ms')).toBe('1.2 s');
    expect(formatValue(6200, 'ms')).toBe('6.2 s');
    expect(formatValue(12500, 'ms')).toBe('13 s');
  });

  it('prints seconds as a duration in two units', () => {
    expect(formatValue(192, 's')).toBe('3m 12s');
    expect(formatValue(250, 's')).toBe('4m 10s');
    expect(formatValue(45, 's')).toBe('45s');
    expect(formatValue(120, 's')).toBe('2m');
    expect(formatValue(7500, 's')).toBe('2h 5m');
    expect(formatValue(3600, 's')).toBe('1h');
    expect(formatValue(90000, 's')).toBe('1d 1h');
    expect(formatValue(86400, 's')).toBe('1d');
    expect(formatValue(0, 's')).toBe('0s');
    expect(formatValue(0.4, 's')).toBe('<1s');
  });

  it('prints a percentage with a space, up to two decimals, and never rounds to a false 100 or 0', () => {
    expect(formatValue(0.42, 'percent')).toBe('0.42 %');
    expect(formatValue(0.4217, 'percent')).toBe('0.42 %');
    expect(formatValue(99.93, 'percent')).toBe('99.93 %');
    expect(formatValue(99.9, 'percent')).toBe('99.9 %');
    expect(formatValue(23, 'percent')).toBe('23 %');
    expect(formatValue(100, 'percent')).toBe('100 %');
    expect(formatValue(0, 'percent')).toBe('0 %');
    expect(formatValue(99.996, 'percent')).toBe('99.99 %');
    expect(formatValue(0.004, 'percent')).toBe('<0.01 %');
  });

  it('prints a rate per minute with thousands separators', () => {
    expect(formatValue(1240, 'per_min')).toBe('1,240 /min');
    expect(formatValue(0.5, 'per_min')).toBe('0.5 /min');
    expect(formatValue(2.34, 'per_min')).toBe('2.3 /min');
    expect(formatValue(12.6, 'per_min')).toBe('13 /min');
    expect(formatValue(0, 'per_min')).toBe('0 /min');
  });

  it('prints a count as a plain number', () => {
    expect(formatValue(23, 'count')).toBe('23');
    expect(formatValue(1240, 'count')).toBe('1,240');
    expect(formatValue(2.5, 'count')).toBe('2.5');
  });

  it('prints bytes in steps of 1024', () => {
    expect(formatValue(0, 'bytes')).toBe('0 B');
    expect(formatValue(512, 'bytes')).toBe('512 B');
    expect(formatValue(1288490189, 'bytes')).toBe('1.2 GB');
    expect(formatValue(536870912, 'bytes')).toBe('512 MB');
    expect(formatValue(12884901888, 'bytes')).toBe('12 GB');
    expect(formatBytes(1048166)).toBe('1 MB');
  });

  it('prints "No data" for null, undefined and numbers that are not numbers, in every unit', () => {
    const units: MeasureUnit[] = ['ms', 's', 'percent', 'per_min', 'count', 'bytes'];
    for (const unit of units) {
      expect(formatValue(null, unit)).toBe(NO_DATA);
      expect(formatValue(undefined, unit)).toBe(NO_DATA);
      expect(formatValue(Number.NaN, unit)).toBe(NO_DATA);
      expect(formatValue(Number.POSITIVE_INFINITY, unit)).toBe(NO_DATA);
    }
    expect(NO_DATA).toBe('No data');
  });

  it('prints the bare number for a unit the contract does not know', () => {
    expect(formatValue(12.345, 'furlongs' as MeasureUnit)).toBe('12.35');
  });
});

describe('formatMeasure', () => {
  it('prints the value of a measure in its unit', () => {
    expect(formatMeasure({ value: 412, unit: 'ms' })).toBe('412 ms');
    expect(formatMeasure({ value: 99.93, unit: 'percent' })).toBe('99.93 %');
    expect(formatMeasure({ value: 3, unit: 'count' })).toBe('3');
  });

  it('prints "No data" for a null value', () => {
    expect(formatMeasure({ value: null, unit: 'ms' })).toBe('No data');
  });
});

describe('formatDuration and plainNumber', () => {
  it('keeps the two largest units and drops empty ones', () => {
    expect(formatDuration(59)).toBe('59s');
    expect(formatDuration(61)).toBe('1m 1s');
    expect(formatDuration(3661)).toBe('1h 1m');
    expect(formatDuration(-5)).toBe('0s');
  });

  it('adds thousands separators and trims trailing zeros', () => {
    expect(plainNumber(1234567)).toBe('1,234,567');
    expect(plainNumber(0.5, 2)).toBe('0.5');
    expect(plainNumber(0.30000000000000004, 2)).toBe('0.3');
  });
});

describe('thresholdText', () => {
  it('prints the warn threshold in the measure unit', () => {
    expect(thresholdText({ unit: 'ms', warn: 800, crit: 1500 })).toBe('warn 800 ms');
    expect(thresholdText({ unit: 'percent', warn: 0.5, crit: 2 })).toBe('warn 0.5 %');
    expect(thresholdText({ unit: 's', warn: 120, crit: 600 })).toBe('warn 2m');
    expect(thresholdText({ unit: 'count', warn: 5, crit: 20 })).toBe('warn 5');
  });

  it('falls back to the crit threshold when there is no warn one', () => {
    expect(thresholdText({ unit: 'ms', warn: null, crit: 1500 })).toBe('crit 1.5 s');
    expect(thresholdText({ unit: 'ms', crit: 1500 })).toBe('crit 1.5 s');
  });

  it('can print both thresholds and rename the warn word', () => {
    expect(thresholdText({ unit: 'ms', warn: 800, crit: 1500 }, { both: true })).toBe(
      'warn 800 ms · crit 1.5 s',
    );
    expect(thresholdText({ unit: 'percent', warn: 99.9 }, { warnLabel: 'target' })).toBe('target 99.9 %');
    expect(thresholdText({ unit: 'ms', warn: null, crit: null }, { both: true })).toBeNull();
  });

  it('prints millisecond thresholds in the scale of the value, so a limit never reads in another unit', () => {
    expect(thresholdText({ unit: 'ms', value: 8700, warn: 800, crit: 1500 })).toBe('warn 0.8 s');
    expect(thresholdText({ unit: 'ms', value: 8700, warn: 800, crit: 1500 }, { both: true })).toBe(
      'warn 0.8 s · crit 1.5 s',
    );
    expect(thresholdText({ unit: 'ms', value: 340, warn: 800, crit: 1500 }, { both: true })).toBe(
      'warn 800 ms · crit 1,500 ms',
    );
    expect(thresholdText({ unit: 'ms', value: null, warn: 800 })).toBe('warn 800 ms');
  });

  it('is null when the measure has no threshold', () => {
    expect(thresholdText({ unit: 'ms' })).toBeNull();
    expect(thresholdText({ unit: 'ms', warn: null, crit: null })).toBeNull();
  });
});

describe('state meta and the problems-first comparator', () => {
  it('gives every state a word, an icon and a tone, and never a green unknown', () => {
    expect(stateMeta('ok')).toMatchObject({ word: 'OK', tone: 'good' });
    expect(stateMeta('warn')).toMatchObject({ word: 'Warn', tone: 'warn', icon: 'alert' });
    expect(stateMeta('crit')).toMatchObject({ word: 'Critical', tone: 'crit', icon: 'xCircle' });
    expect(stateMeta('unknown')).toMatchObject({ word: 'Unknown', tone: 'neutral', icon: 'info' });
  });

  it('puts crit first, then warn, then unknown, then ok', () => {
    const states: MetricState[] = ['ok', 'crit', 'unknown', 'warn', 'ok', 'crit'];
    expect([...states].sort(compareStates)).toEqual(['crit', 'crit', 'warn', 'unknown', 'ok', 'ok']);
    expect(compareStates('ok', 'ok')).toBe(0);
  });
});
