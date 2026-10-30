// Tests for the rules' display rules: the words, the hold-below-block hint, the body of a save and where a server error goes.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import type { RiskRule } from '../types';
import {
  applyChange,
  parseRuleValue,
  ruleErrors,
  rulesBody,
  ruleText,
  ruleValueHint,
  scoringBands,
} from './rules';

const RULES: RiskRule[] = [
  { id: 'blockBlacklistedImei', on: true, value: null },
  { id: 'reviewThreshold', on: true, value: 50 },
  { id: 'blockThreshold', on: true, value: 80 },
  { id: 'require3ds', on: true, value: null },
  {
    id: 'brandNewRule',
    on: false,
    value: 3,
    label: 'A new rule',
    hint: 'Added by the server',
    unit: 'tries',
  },
];

describe('words', () => {
  it('uses the demo’s words for a known rule and the tag for the 3-D Secure rule', () => {
    expect(ruleText(RULES[1])).toMatchObject({ label: 'Hold orders scoring at least', unit: 'points' });
    expect(ruleText(RULES[3]).sameAsSettings).toBe(true);
    expect(ruleText(RULES[1]).sameAsSettings).toBe(false);
  });

  it('uses the server’s words for a rule it does not know, and the id when it sends none', () => {
    expect(ruleText(RULES[4])).toMatchObject({
      label: 'A new rule',
      hint: 'Added by the server',
      unit: 'tries',
    });
    expect(ruleText({ id: 'mystery', on: true, value: null }).label).toBe('mystery');
  });
});

describe('numbers', () => {
  it('reads a whole number and nothing else', () => {
    expect(parseRuleValue(' 60 ')).toBe(60);
    expect(parseRuleValue('0')).toBe(0);
    expect(parseRuleValue('6.5')).toBeNull();
    expect(parseRuleValue('-1')).toBeNull();
    expect(parseRuleValue('abc')).toBeNull();
    expect(parseRuleValue('')).toBeNull();
  });

  it('hints that the hold line stays below the block line, in the demo’s words', () => {
    expect(ruleValueHint(RULES, 'reviewThreshold', '80')).toBe(
      'The hold line must be below the block line. Block starts at 80.',
    );
    expect(ruleValueHint(RULES, 'blockThreshold', '50')).toBe(
      'The block line must be above the hold line. Hold starts at 50.',
    );
    expect(ruleValueHint(RULES, 'reviewThreshold', '79')).toBeNull();
    expect(ruleValueHint(RULES, 'blockThreshold', '51')).toBeNull();
    expect(ruleValueHint(RULES, 'reviewThreshold', 'abc')).toBe('Enter a whole number.');
  });
});

describe('saving', () => {
  it('sends every rule with the one change applied', () => {
    const body = rulesBody(RULES, { id: 'reviewThreshold', value: 60 });
    expect(body.rules).toHaveLength(5);
    expect(body.rules.find((rule) => rule.id === 'reviewThreshold')).toEqual({
      id: 'reviewThreshold',
      on: true,
      value: 60,
    });
    expect(body.rules.find((rule) => rule.id === 'blockThreshold')).toEqual({
      id: 'blockThreshold',
      on: true,
      value: 80,
    });
    expect(rulesBody(RULES, { id: 'require3ds', on: false }).rules[3]).toEqual({
      id: 'require3ds',
      on: false,
      value: null,
    });
  });

  it('applies a change to a copy and keeps the extra wording of the rules', () => {
    const next = applyChange(RULES, { id: 'brandNewRule', on: true });
    expect(next[4]).toMatchObject({ on: true, value: 3, label: 'A new rule' });
    expect(RULES[4].on).toBe(false);
  });

  it('reads the bands of the scoring bar, or none when a line is missing', () => {
    expect(scoringBands(RULES)).toEqual({ hold: 50, block: 80 });
    expect(scoringBands(RULES.filter((rule) => rule.id !== 'blockThreshold'))).toBeNull();
  });
});

describe('server errors', () => {
  const failure = (fieldErrors: Record<string, string[]>, formErrors: string[] = []) =>
    new ApiError({ status: 422, code: 'VALIDATION_FAILED', fieldErrors, formErrors });

  it('puts a message on the rule it names, by id, by path or by index', () => {
    expect(ruleErrors(failure({ reviewThreshold: ['Too high.'] }), RULES).byRule).toEqual({
      reviewThreshold: 'Too high.',
    });
    expect(ruleErrors(failure({ 'rules.blockThreshold.value': ['Too low.'] }), RULES).byRule).toEqual({
      blockThreshold: 'Too low.',
    });
    expect(ruleErrors(failure({ 'rules.1.value': ['Nope.'] }), RULES).byRule).toEqual({
      reviewThreshold: 'Nope.',
    });
  });

  it('keeps the messages that belong to no rule for the line above the list', () => {
    const { byRule, rest } = ruleErrors(failure({ extra: ['Odd.'] }, ['General.']), RULES);
    expect(byRule).toEqual({});
    expect(rest).toEqual(['General.', 'extra: Odd.']);
    expect(ruleErrors(new Error('boom'), RULES)).toEqual({ byRule: {}, rest: [] });
  });
});
