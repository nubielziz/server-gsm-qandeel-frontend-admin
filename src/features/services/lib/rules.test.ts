// Tests for the pricing rule words and form: what a rule covers, what it does to the price, its dates, the request body built from the dialog and
// the fields that changed on an edit; plus the Categories tab's small helpers.
import { describe, expect, it } from 'vitest';
import { fmtDay } from '@/lib/format';
import type { PricingRule } from '../types';
import { sameIds, visibleToText } from './categories';
import { adjustmentText, appliesToText, datesText, ruleDetails } from './rules';
import {
  buildRuleBody,
  changedRuleFields,
  dayEnd,
  dayOf,
  dayStart,
  ruleValues,
  type RuleValues,
} from './ruleForm';

const rule = (overrides: Partial<PricingRule> = {}): PricingRule => ({
  id: 1,
  scope: 'category',
  targetId: 4,
  target: { id: 4, name: 'Carrier unlock' },
  groupId: null,
  group: null,
  kind: 'discount',
  percent: '2.0000',
  fixed: '0.0000',
  rounding: 'none',
  minProfit: '0.0000',
  priority: 100,
  isActive: true,
  startsAt: null,
  endsAt: null,
  ...overrides,
});

describe('words', () => {
  it('says what a rule covers', () => {
    expect(appliesToText(rule())).toBe('Carrier unlock (category)');
    expect(appliesToText(rule({ scope: 'service', target: { id: 5, name: 'AT&T' } }))).toBe('AT&T (service)');
    expect(appliesToText(rule({ scope: 'global', target: null, targetId: null }))).toBe('Every service');
    expect(appliesToText(rule({ target: null, targetId: 9 }))).toBe('#9 (category)');
  });

  it('writes the adjustment as the demo did: plus for a margin, minus for a discount or promo', () => {
    expect(adjustmentText(rule())).toBe('−2%');
    expect(adjustmentText(rule({ kind: 'margin', percent: '5.0000' }))).toBe('+5%');
    expect(adjustmentText(rule({ kind: 'promo', percent: '0.2500' }))).toBe('−0.25%');
    expect(adjustmentText(rule({ kind: 'margin', percent: '2.0000', fixed: '0.5000' }))).toBe('+2% +$0.50');
    expect(adjustmentText(rule({ percent: '0.0000' }))).toBe('–');
  });

  it('writes the small print and the dates', () => {
    expect(ruleDetails(rule())).toBe('priority 100');
    expect(ruleDetails(rule({ rounding: 'nearest_0.05', minProfit: '0.2000', priority: 5 }))).toBe(
      'Nearest $0.05 · keeps $0.20 profit · priority 5',
    );
    const from = '2026-03-05T10:00:00.000Z';
    const to = '2026-03-20T10:00:00.000Z';
    expect(datesText(rule({ startsAt: from, endsAt: to }))).toBe(`From ${fmtDay(from)} to ${fmtDay(to)}`);
    expect(datesText(rule({ startsAt: from }))).toBe(`From ${fmtDay(from)}`);
    expect(datesText(rule({ endsAt: to }))).toBe(`Until ${fmtDay(to)}`);
    expect(datesText(rule())).toBe('');
  });
});

describe('the dialog’s days', () => {
  it('turn a calendar day into the first and last moment of that day and back', () => {
    expect(dayStart('2026-03-05')).toBe(new Date(2026, 2, 5, 0, 0, 0, 0).toISOString());
    expect(dayEnd('2026-03-05')).toBe(new Date(2026, 2, 5, 23, 59, 59, 999).toISOString());
    expect(dayOf(dayStart('2026-03-05'))).toBe('2026-03-05');
    expect(dayOf(dayEnd('2026-03-05'))).toBe('2026-03-05');
  });
});

describe('ruleValues and buildRuleBody', () => {
  const filled = (overrides: Partial<RuleValues> = {}): RuleValues => ({
    ...ruleValues(),
    targetId: '4',
    percent: '2',
    ...overrides,
  });

  it('starts a new rule as a category discount with priority 100', () => {
    expect(ruleValues()).toMatchObject({
      scope: 'category',
      kind: 'discount',
      priority: '100',
      percent: '',
      fixed: '',
    });
  });

  it('fills the form from a saved rule', () => {
    expect(
      ruleValues(rule({ percent: '2.5000', fixed: '0.5000', groupId: 3, startsAt: dayStart('2026-03-05') })),
    ).toMatchObject({
      percent: '2.5',
      fixed: '0.50',
      groupId: '3',
      targetId: '4',
      startsAt: '2026-03-05',
    });
  });

  it('builds the body, padding amounts as text and sending empty ones as zero', () => {
    expect(buildRuleBody(filled({ fixed: '0.5', groupId: '2', startsAt: '2026-03-05' }))).toEqual({
      body: {
        scope: 'category',
        targetId: 4,
        groupId: 2,
        kind: 'discount',
        percent: '2.0000',
        fixed: '0.5000',
        rounding: 'none',
        minProfit: '0.0000',
        priority: 100,
        startsAt: dayStart('2026-03-05'),
        endsAt: null,
      },
    });
  });

  it('has no target for a rule on every service', () => {
    expect(buildRuleBody(filled({ scope: 'global', targetId: '' }))).toMatchObject({
      body: { targetId: null },
    });
  });

  it('names the first mistake and its field', () => {
    expect(buildRuleBody(filled({ targetId: '' }))).toEqual({
      error: 'Choose the category.',
      field: 'targetId',
    });
    expect(buildRuleBody(filled({ scope: 'service', targetId: '' }))).toMatchObject({
      error: 'Choose the service.',
    });
    expect(buildRuleBody(filled({ percent: '', fixed: '' }))).toMatchObject({ field: 'percent' });
    expect(buildRuleBody(filled({ percent: 'x' }))).toMatchObject({
      field: 'percent',
      error: 'Enter a number such as 2 or 0.50.',
    });
    expect(buildRuleBody(filled({ minProfit: '-1' }))).toMatchObject({ field: 'minProfit' });
    expect(buildRuleBody(filled({ priority: 'x' }))).toMatchObject({ field: 'priority' });
    expect(buildRuleBody(filled({ startsAt: '2026-03-20', endsAt: '2026-03-05' }))).toMatchObject({
      field: 'endsAt',
    });
  });
});

describe('changedRuleFields', () => {
  const body = (overrides = {}) => {
    const built = buildRuleBody({ ...ruleValues(rule()), ...overrides });
    if ('error' in built) throw new Error(built.error);
    return built.body;
  };

  it('is empty when nothing changed', () => {
    expect(changedRuleFields(body(), rule())).toEqual({});
  });

  it('holds only the fields that differ, comparing amounts as numbers and dates as days', () => {
    expect(changedRuleFields(body({ percent: '3', priority: '10' }), rule())).toEqual({
      percent: '3.0000',
      priority: 10,
    });
    expect(changedRuleFields(body({ percent: '2.00' }), rule())).toEqual({});
    const dated = rule({ startsAt: dayStart('2026-03-05') });
    expect(changedRuleFields(body({ startsAt: '2026-03-05' }), dated)).toEqual({});
    expect(changedRuleFields(body({ startsAt: '' }), dated)).toEqual({ startsAt: null });
  });
});

describe('categories', () => {
  it('says who sees a category', () => {
    const groups = [
      { id: 2, name: 'Wholesale' },
      { id: 3, name: 'VIP' },
    ];
    expect(visibleToText([], groups)).toBe('All groups');
    expect(visibleToText([3, 2], groups)).toBe('VIP, Wholesale');
    expect(visibleToText([2, 9], groups)).toBe('Wholesale, #9');
    expect(visibleToText([2, 3], undefined)).toBe('2 groups');
    expect(visibleToText([2], undefined)).toBe('1 group');
  });

  it('compares lists of ids in any order', () => {
    expect(sameIds([1, 2], [2, 1])).toBe(true);
    expect(sameIds([1, 2], [1])).toBe(false);
    expect(sameIds([], [])).toBe(true);
  });
});
