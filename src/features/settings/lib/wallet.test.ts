// Tests for the Customer wallet settings: the eight keys and their ranges (the same as the server's registry), the switch reading, and the
// warning for a smallest top-up above the largest.
import { describe, expect, it } from 'vitest';
import { limitsWarning, switchOn, WALLET_KEYS, WALLET_SETTINGS } from './wallet';

describe('WALLET_SETTINGS', () => {
  it('has the eight keys of the server, two switches and six whole numbers', () => {
    expect(WALLET_SETTINGS.map((spec) => spec.key)).toEqual(Object.values(WALLET_KEYS));
    expect(WALLET_SETTINGS.filter((spec) => spec.type === 'boolean')).toHaveLength(2);
    expect(WALLET_SETTINGS.filter((spec) => spec.type === 'integer')).toHaveLength(6);
  });

  it('uses the ranges of the server’s registry', () => {
    const range = (key: string) => {
      const spec = WALLET_SETTINGS.find((candidate) => candidate.key === key);
      return spec && spec.type === 'integer' ? [spec.min, spec.max] : null;
    };
    expect(range(WALLET_KEYS.minTopUp)).toEqual([1, 10_000]);
    expect(range(WALLET_KEYS.maxTopUp)).toEqual([1, 100_000]);
    expect(range(WALLET_KEYS.maxBalance)).toEqual([1, 1_000_000]);
    expect(range(WALLET_KEYS.topUpsPerDay)).toEqual([1, 100]);
    expect(range(WALLET_KEYS.topUpAmountPerDay)).toEqual([1, 1_000_000]);
    expect(range(WALLET_KEYS.adjustApprovalLimit)).toEqual([0, 10_000]);
  });
});

describe('switchOn', () => {
  const spec = { key: WALLET_KEYS.enabled, label: 'Store balance', type: 'boolean', hint: '' } as const;
  it('is on only for an explicit true; an unset key is off', () => {
    expect(switchOn({ [WALLET_KEYS.enabled]: true }, spec)).toBe(true);
    expect(switchOn({ [WALLET_KEYS.enabled]: false }, spec)).toBe(false);
    expect(switchOn({}, spec)).toBe(false);
    expect(switchOn(undefined, spec)).toBe(false);
  });
});

describe('limitsWarning', () => {
  it('warns when the smallest top-up is above the largest, and only then', () => {
    expect(limitsWarning({ [WALLET_KEYS.minTopUp]: 50, [WALLET_KEYS.maxTopUp]: 10 })).toMatch(/ignores both/);
    expect(limitsWarning({ [WALLET_KEYS.minTopUp]: 10, [WALLET_KEYS.maxTopUp]: 10 })).toBeNull();
    expect(limitsWarning({ [WALLET_KEYS.minTopUp]: 10 })).toBeNull();
    expect(limitsWarning(undefined)).toBeNull();
  });
});
