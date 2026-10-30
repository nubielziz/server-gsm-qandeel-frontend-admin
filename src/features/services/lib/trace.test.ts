// Tests for how a step of the price resolution is drawn: its look, the figure on the right and the "= $X" line, as the demo's resolver drew them.
import { describe, expect, it } from 'vitest';
import type { PriceStep } from '../types';
import { isLive, SOURCE_WORDS, STEP_LOOK, stepAfterText, stepValueText } from './trace';

const step = (overrides: Partial<PriceStep>): PriceStep => ({
  id: 'base',
  label: 'Base price',
  state: 'apply',
  value: 17.28,
  after: 17.28,
  note: '',
  ...overrides,
});

describe('stepValueText', () => {
  it('writes a price as money, from a number or from decimal text', () => {
    expect(stepValueText(step({ id: 'client', state: 'win', value: 15.2 }))).toBe('$15.20');
    expect(stepValueText(step({ id: 'client', state: 'win', value: '15.2000' }))).toBe('$15.20');
  });

  it('writes the category rule and the group discount as signed percentages', () => {
    expect(stepValueText(step({ id: 'category', value: -0.02 }))).toBe('−2%');
    expect(stepValueText(step({ id: 'category', value: 0.05 }))).toBe('+5%');
    expect(stepValueText(step({ id: 'discount', value: 0.08 }))).toBe('−8%');
  });

  it('shows nothing for a step with no value or a rule that is off', () => {
    expect(stepValueText(step({ id: 'client', state: 'none', value: null }))).toBe('');
    expect(stepValueText(step({ id: 'category', state: 'none', value: 0 }))).toBe('');
    expect(stepValueText(step({ id: 'discount', state: 'none', value: null }))).toBe('');
  });

  it('keeps the skipped base price, which the row strikes through, and nothing else skipped', () => {
    expect(stepValueText(step({ id: 'base', state: 'skip', value: 17.28 }))).toBe('$17.28');
    expect(stepValueText(step({ id: 'group', state: 'skip', value: 15.9 }))).toBe('');
  });
});

describe('stepAfterText', () => {
  it('shows the running price after a step that changed it', () => {
    expect(stepAfterText(step({ id: 'category', value: -0.02, after: 16.93 }))).toBe('= $16.93');
    expect(stepAfterText(step({ id: 'group', state: 'win', value: 15.9, after: 14.5 }))).toBe('= $14.50');
  });

  it('shows nothing when the step left the price as it was, or was not used', () => {
    expect(stepAfterText(step({ id: 'base', value: 17.28, after: 17.28 }))).toBeNull();
    expect(stepAfterText(step({ id: 'base', state: 'skip', after: null }))).toBeNull();
    expect(stepAfterText(step({ id: 'client', state: 'none', after: null }))).toBeNull();
    expect(stepAfterText(step({ id: 'group', state: 'skip', value: 15.9, after: 15.9 }))).toBeNull();
  });
});

describe('looks and words', () => {
  it('tints the steps that decided or changed the price', () => {
    expect(isLive(step({ state: 'win' }))).toBe(true);
    expect(isLive(step({ state: 'apply' }))).toBe(true);
    expect(isLive(step({ state: 'skip' }))).toBe(false);
    expect(isLive(step({ state: 'none' }))).toBe(false);
  });

  it('has a word and an icon for every state, and the demo’s words for the source', () => {
    expect(Object.values(STEP_LOOK).map((look) => look.word)).toEqual([
      'Used',
      'Applied',
      'Skipped',
      'Not set',
    ]);
    expect(SOURCE_WORDS).toEqual({ base: 'base price', group: 'group price', client: 'client override' });
  });
});
