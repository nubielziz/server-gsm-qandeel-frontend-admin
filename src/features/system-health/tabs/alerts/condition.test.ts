// Tests for the text of alerts and rules: the condition line, the subject, who acknowledged and the channels.
import { describe, expect, it } from 'vitest';
import type { AlertRuleRef } from '../../types';
import {
  acknowledgedBy,
  channelLabel,
  channelsText,
  comparatorSymbol,
  conditionText,
  limitText,
  printInUnit,
  subjectText,
  windowText,
} from './condition';

const rule = (over: Partial<AlertRuleRef> = {}): AlertRuleRef => ({
  id: 1,
  key: 'supplier_timeout_rate',
  name: 'Supplier timeouts',
  metric: 'supplier.timeout_rate',
  comparator: 'gt',
  threshold: 20,
  windowSeconds: 180,
  unit: 'percent',
  ...over,
});

describe('conditionText', () => {
  it('prints the value, the comparator, the threshold and the window with the unit', () => {
    expect(conditionText(23.4, rule())).toBe('23.4 % > 20 % for 3m');
    expect(conditionText(23, rule())).toBe('23 % > 20 % for 3m');
  });

  it('writes durations in words when the unit is seconds', () => {
    expect(conditionText(192, rule({ unit: 's', threshold: 120, windowSeconds: 120 }))).toBe(
      '3m 12s > 2m for 2m',
    );
  });

  it('keeps the unit visible for milliseconds, counts and rates', () => {
    expect(conditionText(1720, rule({ unit: 'ms', threshold: 1500, windowSeconds: 300 }))).toBe(
      '1.7 s > 1.5 s for 5m',
    );
    expect(conditionText(23, rule({ unit: 'count', threshold: 20, windowSeconds: 300 }))).toBe(
      '23 > 20 for 5m',
    );
    expect(conditionText(130, rule({ unit: 'per_min', threshold: 100, windowSeconds: 60 }))).toBe(
      '130 /min > 100 /min for 1m',
    );
  });

  it('prints a plain number, not an invented unit, for a rule without one', () => {
    expect(
      conditionText(118.2, rule({ unit: null, comparator: 'lt', threshold: 150, windowSeconds: 3600 })),
    ).toBe('118.2 < 150 for 1h');
  });

  it('says "No data" for a missing value and never zero', () => {
    expect(conditionText(null, rule())).toBe('No data > 20 % for 3m');
  });

  it('uses the sign of every comparator and passes an unknown one through', () => {
    expect(['gt', 'gte', 'lt', 'lte'].map(comparatorSymbol)).toEqual(['>', '≥', '<', '≤']);
    expect(comparatorSymbol('between')).toBe('between');
    expect(limitText(rule({ comparator: 'lte', threshold: 5, windowSeconds: 90 }))).toBe('≤ 5 % for 1m 30s');
  });
});

describe('printInUnit and windowText', () => {
  it('prints numbers in their unit', () => {
    expect(printInUnit(20, 'percent')).toBe('20 %');
    expect(printInUnit(1234.5, null)).toBe('1,234.5');
    expect(printInUnit(undefined, 'ms')).toBe('No data');
    expect(windowText(86_400)).toBe('1d');
  });
});

describe('subjectText', () => {
  it('names a supplier with its kind', () => {
    expect(subjectText({ subjectType: 'supplier', subjectId: 3, subjectLabel: 'Rapid IMEI' })).toEqual({
      name: 'Rapid IMEI',
      kind: 'Supplier',
      code: false,
    });
  });

  it('prints a queue as a code', () => {
    const subject = subjectText({ subjectType: 'queue', subjectId: 0, subjectLabel: 'orders.dispatch' });
    expect(subject).toEqual({ name: 'orders.dispatch', kind: 'Queue', code: true });
  });

  it('calls an alert without a label about the whole platform, and has no kind line for it', () => {
    expect(subjectText({ subjectType: 'system', subjectId: 0, subjectLabel: null })).toEqual({
      name: 'Whole platform',
      kind: null,
      code: false,
    });
  });

  it('falls back to the id and a readable kind for a subject the console does not know', () => {
    expect(subjectText({ subjectType: 'ledger_account', subjectId: 87, subjectLabel: null })).toEqual({
      name: '#87',
      kind: 'Ledger account',
      code: false,
    });
    expect(subjectText({ subjectType: 'new_thing', subjectId: 4, subjectLabel: null }).kind).toBe(
      'New thing',
    );
  });
});

describe('acknowledgedBy', () => {
  it('names the staff member, says Unknown when only the time is left, and is null for an open alert', () => {
    expect(
      acknowledgedBy({ acknowledgedBy: { id: 4, name: 'Dana M.' }, acknowledgedAt: '2026-10-31T10:00:00Z' }),
    ).toBe('Dana M.');
    expect(acknowledgedBy({ acknowledgedBy: null, acknowledgedAt: '2026-10-31T10:00:00Z' })).toBe('Unknown');
    expect(acknowledgedBy({ acknowledgedBy: null, acknowledgedAt: null })).toBeNull();
  });
});

describe('channels', () => {
  it('prints the channels as words and passes an unknown one through', () => {
    expect(channelsText(['telegram', 'email'])).toBe('Telegram, Email');
    expect(channelLabel('sms')).toBe('sms');
    expect(channelLabel('constructor')).toBe('constructor');
  });
});
