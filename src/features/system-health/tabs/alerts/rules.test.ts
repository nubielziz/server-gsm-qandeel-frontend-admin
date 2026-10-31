// Tests for the rule form: the choices, the values and the request bodies they make, problems first and the mute.
import { describe, expect, it } from 'vitest';
import type { AlertRule } from '../../types';
import {
  BLANK_RULE,
  METRICS,
  isMuted,
  localInputIn,
  metricOptions,
  problemsFirst,
  ruleValues,
  toCreateBody,
  toUpdateBody,
  unitHint,
  withCurrent,
} from './rules';

const rule = (over: Partial<AlertRule> = {}): AlertRule => ({
  id: 1,
  key: 'api_rate5xx',
  name: 'API 5xx rate',
  metric: 'api.rate5xx',
  comparator: 'gt',
  threshold: 2,
  windowSeconds: 300,
  severity: 'critical',
  channels: ['telegram', 'email'],
  unit: 'percent',
  isActive: true,
  mutedUntil: null,
  open: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  ...over,
});

describe('the metric choices', () => {
  it('starts with a "Choose a metric" line and lists each metric with its key', () => {
    const options = metricOptions();
    expect(options[0]).toEqual({ value: '', label: 'Choose a metric' });
    expect(options).toHaveLength(METRICS.length + 1);
    expect(options).toContainEqual({ value: 'api.p95', label: 'API p95 latency (api.p95)' });
  });

  it('keeps the metric of a rule the form does not know, so an edit never drops it', () => {
    expect(metricOptions('custom.metric').at(-1)).toEqual({ value: 'custom.metric', label: 'custom.metric' });
    expect(metricOptions('api.p95').filter((option) => option.value === 'api.p95')).toHaveLength(1);
  });

  it('keeps a comparator or severity the form does not know as a choice, and adds nothing when it is known', () => {
    const options = [
      { value: 'gt', label: 'Greater than (>)' },
      { value: 'lt', label: 'Less than (<)' },
    ];
    expect(withCurrent(options, 'between').at(-1)).toEqual({ value: 'between', label: 'between' });
    expect(withCurrent(options, 'gt')).toEqual(options);
    expect(withCurrent(options)).toEqual(options);
  });

  it('names the unit of the threshold, or none for a plain number or an unknown metric', () => {
    expect(unitHint('api.rate5xx')).toBe('%');
    expect(unitHint('queue.oldest_age')).toBe('seconds');
    expect(unitHint('supplier.balance')).toBeNull();
    expect(unitHint('custom.metric')).toBeNull();
    expect(unitHint('')).toBeNull();
  });
});

describe('the form values and the bodies', () => {
  it('starts a new rule switched on, with Telegram and a 5 minute window, and nothing chosen yet', () => {
    expect(BLANK_RULE).toMatchObject({
      metric: '',
      isActive: true,
      channels: ['telegram'],
      windowSeconds: '300',
    });
  });

  it('turns a rule into form values (numbers become text) and back into the create body', () => {
    const values = ruleValues(rule());
    expect(values).toMatchObject({ threshold: '2', windowSeconds: '300', channels: ['telegram', 'email'] });
    expect(toCreateBody(values)).toEqual({
      key: 'api_rate5xx',
      name: 'API 5xx rate',
      metric: 'api.rate5xx',
      comparator: 'gt',
      threshold: 2,
      windowSeconds: 300,
      severity: 'critical',
      channels: ['telegram', 'email'],
      isActive: true,
    });
  });

  it('trims the name and the key, and reads decimals', () => {
    const body = toCreateBody({
      ...BLANK_RULE,
      name: '  Slow  ',
      key: ' slow_one ',
      threshold: '0.5',
      metric: 'api.p95',
    });
    expect(body).toMatchObject({ name: 'Slow', key: 'slow_one', threshold: 0.5 });
  });

  it('sends only what changed when editing', () => {
    const original = rule();
    const values = { ...ruleValues(original), threshold: '3', severity: 'warning' as const };
    expect(toUpdateBody(original, values)).toEqual({ threshold: 3, severity: 'warning' });
  });

  it('sends nothing when nothing changed, and ignores the order of the channels', () => {
    const original = rule();
    expect(toUpdateBody(original, ruleValues(original))).toEqual({});
    expect(toUpdateBody(original, { ...ruleValues(original), channels: ['email', 'telegram'] })).toEqual({});
  });

  it('sends the channels and the switch when they change', () => {
    const body = toUpdateBody(rule(), { ...ruleValues(rule()), channels: ['email'], isActive: false });
    expect(body).toEqual({ channels: ['email'], isActive: false });
  });
});

describe('problemsFirst', () => {
  it('puts rules with an open alert first and keeps the server order otherwise', () => {
    const rows = [rule({ id: 1 }), rule({ id: 2, open: true }), rule({ id: 3 }), rule({ id: 4, open: true })];
    expect(problemsFirst(rows).map((row) => row.id)).toEqual([2, 4, 1, 3]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('the mute', () => {
  const now = Date.parse('2026-10-31T12:00:00.000Z');

  it('is on while mutedUntil has not passed', () => {
    expect(isMuted({ mutedUntil: '2026-10-31T12:00:01.000Z' }, now)).toBe(true);
    expect(isMuted({ mutedUntil: '2026-10-31T11:59:59.000Z' }, now)).toBe(false);
  });

  it('is off without a time or with one that cannot be read', () => {
    expect(isMuted({ mutedUntil: null }, now)).toBe(false);
    expect(isMuted({ mutedUntil: 'tomorrow' }, now)).toBe(false);
  });

  it('makes a datetime-local value some hours from now', () => {
    const value = localInputIn(8, now);
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // Read back in the same zone, the value is eight hours after the start (to the minute).
    expect(new Date(value).getTime() - new Date(localInputIn(0, now)).getTime()).toBe(8 * 3_600_000);
  });
});
