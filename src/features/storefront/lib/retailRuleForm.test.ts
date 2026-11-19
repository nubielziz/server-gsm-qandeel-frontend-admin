// Tests for the retail pricing rule form: its first values, the bodies it builds (text reshaped, never worked out), the hints for
// the shape of a number, and the figures an edit changed.
import { describe, expect, it } from 'vitest';
import {
  buildRuleBody,
  changedRuleFields,
  isPercentText,
  percentInput,
  RULE_FIELD_ALIASES,
  ruleValues,
  toPercentText,
  type RuleValues,
} from './retailRuleForm';
import type { RetailPriceRule } from '../types';

const IMEI_RULE: RetailPriceRule = {
  id: 2,
  scope: 'type',
  serviceType: 'imei',
  categoryId: null,
  categoryName: null,
  percent: '30.0000',
  fixed: '0.5000',
  rounding: 'ends_99',
  roundFrom: '5.0000',
  autoFollowPercent: 25,
  isActive: true,
  label: 'IMEI +30% +$0.50, ends in .99',
  following: 4,
  updatedAt: '2026-11-16T10:00:00.000Z',
};

const filled = (changes: Partial<RuleValues> = {}): RuleValues => ({
  ...ruleValues(),
  percent: '30',
  ...changes,
});

describe('percent text', () => {
  it('accepts up to four decimals and pads to the API’s four', () => {
    expect(isPercentText('30')).toBe(true);
    expect(isPercentText(' 12.5 ')).toBe(true);
    expect(isPercentText('0.0001')).toBe(true);
    expect(isPercentText('12.12345')).toBe(false);
    expect(isPercentText('-5')).toBe(false);
    expect(isPercentText('')).toBe(false);
    expect(toPercentText('30')).toBe('30.0000');
    expect(toPercentText('12.5')).toBe('12.5000');
  });

  it('shows an API percentage without the trailing zeros', () => {
    expect(percentInput('30.0000')).toBe('30');
    expect(percentInput('12.5000')).toBe('12.5');
    expect(percentInput('100.0001')).toBe('100.0001');
    expect(percentInput('0.0000')).toBe('0');
  });
});

describe('ruleValues', () => {
  it('starts a new rule on every service with the server’s defaults and no margin', () => {
    expect(ruleValues()).toEqual({
      scope: 'global',
      serviceType: '',
      categoryId: '',
      percent: '',
      fixed: '',
      rounding: 'cent',
      roundFrom: '5.00',
      autoFollowPercent: '25',
    });
  });

  it('starts the first rule of the shop on the owner’s example', () => {
    expect(ruleValues(undefined, true)).toMatchObject({
      scope: 'type',
      serviceType: 'imei',
      percent: '30',
      rounding: 'ends_99',
    });
  });

  it('shows the figures of a rule being edited', () => {
    expect(ruleValues(IMEI_RULE)).toEqual({
      scope: 'type',
      serviceType: 'imei',
      categoryId: '',
      percent: '30',
      fixed: '0.50',
      rounding: 'ends_99',
      roundFrom: '5.00',
      autoFollowPercent: '25',
    });
    expect(ruleValues({ ...IMEI_RULE, scope: 'category', serviceType: null, categoryId: 4 }).categoryId).toBe(
      '4',
    );
  });
});

describe('buildRuleBody', () => {
  it('builds the body of a rule for every service, padding the figures and sending no target', () => {
    expect(buildRuleBody(filled({ fixed: '0.5', roundFrom: '5', autoFollowPercent: '10' }))).toEqual({
      body: {
        scope: 'global',
        percent: '30.0000',
        fixed: '0.5000',
        rounding: 'cent',
        roundFrom: '5.0000',
        autoFollowPercent: 10,
      },
    });
  });

  it('sends the service type for a type rule and the id for a category rule, and treats an empty fixed amount as none', () => {
    expect(buildRuleBody(filled({ scope: 'type', serviceType: 'server' }))).toMatchObject({
      body: { scope: 'type', serviceType: 'server', fixed: '0.0000' },
    });
    const category = buildRuleBody(filled({ scope: 'category', categoryId: '12' }));
    expect(category).toMatchObject({ body: { scope: 'category', categoryId: 12 } });
    expect('body' in category && 'serviceType' in category.body).toBe(false);
  });

  it('names the field of the first thing that has the wrong shape, and never judges a range', () => {
    expect(buildRuleBody(filled({ scope: 'type' }))).toEqual({
      error: 'Choose a service type.',
      field: 'serviceType',
    });
    expect(buildRuleBody(filled({ scope: 'category' }))).toEqual({
      error: 'Choose a category.',
      field: 'categoryId',
    });
    expect(buildRuleBody(filled({ percent: 'abc' }))).toMatchObject({ field: 'percent' });
    expect(buildRuleBody(filled({ fixed: '1,5' }))).toMatchObject({ field: 'fixed' });
    expect(buildRuleBody(filled({ roundFrom: '' }))).toMatchObject({ field: 'roundFrom' });
    expect(buildRuleBody(filled({ autoFollowPercent: '2.5' }))).toMatchObject({ field: 'autoFollowPercent' });
    // 5000% and a fixed amount of a million have the right shape: the server refuses them, in its words.
    expect(buildRuleBody(filled({ percent: '5000', fixed: '1000000' }))).toMatchObject({
      body: { percent: '5000.0000', fixed: '1000000.0000' },
    });
  });
});

describe('changedRuleFields', () => {
  it('is empty when the form holds the rule’s own figures, however they are spelled', () => {
    const built = buildRuleBody({ ...ruleValues(IMEI_RULE), percent: '30.0' });
    expect(built).toHaveProperty('body');
    if ('body' in built) expect(changedRuleFields(built.body, IMEI_RULE)).toEqual({});
  });

  it('holds only the figures that differ, and never the scope, the target or the switch', () => {
    const built = buildRuleBody({
      ...ruleValues(IMEI_RULE),
      percent: '35',
      rounding: 'cent',
      autoFollowPercent: '0',
    });
    if (!('body' in built)) throw new Error('The form was valid.');
    expect(changedRuleFields(built.body, IMEI_RULE)).toEqual({
      percent: '35.0000',
      rounding: 'cent',
      autoFollowPercent: 0,
    });
  });
});

describe('RULE_FIELD_ALIASES', () => {
  it('maps the path of a previewed rule back to the form field', () => {
    expect(RULE_FIELD_ALIASES['change.rule.percent']).toBe('percent');
    expect(RULE_FIELD_ALIASES['rule.categoryId']).toBe('categoryId');
    expect(RULE_FIELD_ALIASES['change.rule.scope']).toBe('scope');
  });
});
