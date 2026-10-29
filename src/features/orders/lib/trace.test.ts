// Tests for "How was this priced?": reading the order's pricing snapshot without trusting its shape.
import { describe, expect, it } from 'vitest';
import { pricingTrace, stepValueText } from './trace';

describe('pricingTrace', () => {
  it('reads the source, the steps and the floor of a snapshot', () => {
    const trace = pricingTrace({
      source: 'group',
      floor: '10.3900',
      clamped: true,
      steps: [
        { id: 'client', label: 'Client override', state: 'none', value: null, after: null, note: 'None' },
        {
          id: 'group',
          label: 'Group service price',
          state: 'win',
          value: 11.5,
          after: 11.5,
          note: 'VIP price',
        },
      ],
    });
    expect(trace.source).toBe('group');
    expect(trace.floor).toBe(10.39);
    expect(trace.clamped).toBe(true);
    expect(trace.steps.map((step) => [step.id, step.state, step.value])).toEqual([
      ['client', 'none', null],
      ['group', 'win', 11.5],
    ]);
  });

  it('survives a snapshot of any shape', () => {
    expect(pricingTrace(null)).toEqual({ source: null, steps: [], floor: null, clamped: false, extras: [] });
    expect(pricingTrace({ steps: 'nope' })).toMatchObject({ steps: [] });
    const odd = pricingTrace({ steps: [1, null, { state: 'maybe', value: 'x' }] });
    expect(odd.steps).toHaveLength(1);
    expect(odd.steps[0]).toMatchObject({ state: 'none', value: null, label: 'step-2' });
  });

  it('keeps the other plain values, so a snapshot without steps still shows something', () => {
    expect(
      pricingTrace({ source: 'base', basePrice: '12.0000', note: 'x', nested: { a: 1 } }).extras,
    ).toEqual([
      ['basePrice', '12.0000'],
      ['note', 'x'],
    ]);
  });
});

describe('stepValueText', () => {
  const step = (overrides: Partial<Parameters<typeof stepValueText>[0]>) =>
    ({
      id: 'client',
      label: 'x',
      state: 'win',
      value: 12.5,
      after: null,
      note: '',
      ...overrides,
    }) as Parameters<typeof stepValueText>[0];

  it('writes a price as money, the category rule as a signed percent and the discount as a minus', () => {
    expect(stepValueText(step({}))).toBe('$12.50');
    expect(stepValueText(step({ id: 'category', value: 0.08 }))).toBe('+8%');
    expect(stepValueText(step({ id: 'category', value: -0.05 }))).toBe('−5%');
    expect(stepValueText(step({ id: 'discount', value: 0.04 }))).toBe('−4%');
  });

  it('shows nothing for a skipped step, except the struck-through base price', () => {
    expect(stepValueText(step({ state: 'skip' }))).toBe('');
    expect(stepValueText(step({ id: 'base', state: 'skip' }))).toBe('$12.50');
    expect(stepValueText(step({ value: null }))).toBe('');
  });
});
