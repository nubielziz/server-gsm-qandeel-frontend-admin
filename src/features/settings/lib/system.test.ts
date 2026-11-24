// Tests for the System tab helpers: which keys are unknown, the field text and the range check.
import { describe, expect, it } from 'vitest';
import type { Settings } from '../types';
import { fieldText, settingProblem, unknownSettings, type NumberSetting } from './system';

const days: NumberSetting = {
  key: 'someDays',
  label: 'Some days',
  type: 'integer',
  unit: 'days',
  hint: '',
  min: 0,
  max: 3650,
};

describe('unknownSettings', () => {
  it('leaves out the keys handled elsewhere and sorts the rest', () => {
    const rows = unknownSettings({
      adminAllowlistOnly: true,
      guestCheckout: true,
      zebra: 'z',
      banner: { text: 'Hi' },
      missing: undefined,
    });
    expect(rows).toEqual([
      ['banner', { text: 'Hi' }],
      ['zebra', 'z'],
    ]);
    expect(unknownSettings(undefined)).toEqual([]);
  });

  it('does not show the two settings an older server still sends for the retired IMEI check', () => {
    expect(unknownSettings({ imeiPrecheck: true, imeiRetentionDays: 180, zebra: 'z' })).toEqual([
      ['zebra', 'z'],
    ]);
  });
});

describe('fieldText and settingProblem', () => {
  it('reads the saved number as the box’s text', () => {
    expect(fieldText({ someDays: 180 }, days)).toBe('180');
    expect(fieldText({}, days)).toBe('');
    expect(fieldText({ someDays: 'x' } as unknown as Settings, days)).toBe('');
  });

  it('wants a whole number inside the range', () => {
    expect(settingProblem(days, '90')).toBeNull();
    expect(settingProblem(days, '3651')).toBe('Enter 0 to 3650.');
    expect(settingProblem(days, '1.5')).toBe('Enter a whole number.');
    expect(settingProblem(days, '')).toBe('Enter a whole number.');
  });
});
