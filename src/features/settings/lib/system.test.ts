// Tests for the System tab helpers: which keys are unknown, the field text and the range check.
import { describe, expect, it } from 'vitest';
import type { Settings } from '../types';
import { fieldText, KNOWN_SETTINGS, settingProblem, unknownSettings } from './system';

const retention = KNOWN_SETTINGS[0];

describe('unknownSettings', () => {
  it('leaves out the keys handled elsewhere and sorts the rest', () => {
    const rows = unknownSettings({
      imeiRetentionDays: 180,
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
});

describe('fieldText and settingProblem', () => {
  it('reads the saved number as the box’s text', () => {
    expect(fieldText({ imeiRetentionDays: 180 }, retention)).toBe('180');
    expect(fieldText({}, retention)).toBe('');
    expect(fieldText({ imeiRetentionDays: 'x' } as unknown as Settings, retention)).toBe('');
  });

  it('wants a whole number inside the range', () => {
    expect(settingProblem(retention, '90')).toBeNull();
    expect(settingProblem(retention, '3651')).toBe('Enter 0 to 3650.');
    expect(settingProblem(retention, '1.5')).toBe('Enter a whole number.');
    expect(settingProblem(retention, '')).toBe('Enter a whole number.');
  });
});
