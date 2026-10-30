// Tests for the plan helpers: the kind words, the rate check, the conditions as a table summary and as editable text, and the plan menu.
import { describe, expect, it } from 'vitest';
import type { CommissionPlan } from '../types';
import {
  conditionsText,
  conditionsToField,
  isRateText,
  kindLabel,
  parseConditions,
  planChoices,
  sameConditions,
} from './plans';

describe('kindLabel', () => {
  it('words the two kinds and shows any other as it is', () => {
    expect(kindLabel('referral')).toBe('Referral');
    expect(kindLabel('rebate')).toBe('Rebate');
    expect(kindLabel('cashback')).toBe('cashback');
  });
});

describe('isRateText', () => {
  it('takes a positive number up to 100 with at most four decimals', () => {
    for (const ok of ['3', '3.5', ' 12.25 ', '100', '0.5']) expect(isRateText(ok)).toBe(true);
    for (const bad of ['', '0', '-1', '101', '3,5', 'abc', '1.23456', '3%'])
      expect(isRateText(bad)).toBe(false);
  });
});

describe('conditionsText', () => {
  it('summarises the conditions in one line', () => {
    expect(conditionsText({ minPayout: '50.0000', minReferrals: 3 })).toBe(
      'minPayout: 50.0000, minReferrals: 3',
    );
    expect(conditionsText({ brackets: [{ from: '1' }, { from: '2' }], nested: { a: 1 } })).toBe(
      'brackets: 2 items, nested: …',
    );
    expect(conditionsText({ one: [1] })).toBe('one: 1 item');
  });

  it('is a dash for no conditions', () => {
    expect(conditionsText({})).toBe('–');
    expect(conditionsText(null)).toBe('–');
  });
});

describe('conditions as text', () => {
  it('shows formatted JSON, or nothing when there are no conditions', () => {
    expect(conditionsToField({ minPayout: '50' })).toBe('{\n  "minPayout": "50"\n}');
    expect(conditionsToField({})).toBe('');
  });

  it('reads an object back, and an empty text as no conditions', () => {
    expect(parseConditions('{"minPayout": "50"}')).toEqual({ ok: true, value: { minPayout: '50' } });
    expect(parseConditions('  ')).toEqual({ ok: true, value: {} });
  });

  it('refuses text that is not a JSON object', () => {
    for (const bad of ['[1]', '5', 'null', '{bad', 'hello']) {
      expect(parseConditions(bad)).toMatchObject({ ok: false });
    }
  });

  it('compares conditions whatever the key order', () => {
    expect(sameConditions({ a: 1, b: { c: [1, 2], d: 3 } }, { b: { d: 3, c: [1, 2] }, a: 1 })).toBe(true);
    expect(sameConditions({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('planChoices', () => {
  it('lists each plan with its rate and marks a plan that is off', () => {
    const plan = (over: Partial<CommissionPlan>): CommissionPlan => ({
      id: 1,
      name: 'Referral',
      kind: 'referral',
      basis: 'x',
      percent: '3.0000',
      tiers: {},
      period: 'monthly',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      ...over,
    });
    expect(planChoices([plan({}), plan({ id: 2, name: 'Old', percent: '1.5000', isActive: false })])).toEqual(
      [
        { value: 1, label: 'Referral (3%)' },
        { value: 2, label: 'Old (1.5%) – off' },
      ],
    );
  });
});
