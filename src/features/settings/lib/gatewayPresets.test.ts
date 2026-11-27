// Tests for the gallery helpers: the count of methods made from a preset. (The code of a new method is made by the server.)
import { describe, expect, it } from 'vitest';
import { addedCount } from './gatewayPresets';

describe('addedCount', () => {
  it('counts the methods made from one preset and ignores custom ones', () => {
    const rows = [
      { preset: 'instapay' },
      { preset: null },
      { preset: 'instapay' },
      { preset: 'binance_pay' },
    ];
    expect(addedCount('instapay', rows)).toBe(2);
    expect(addedCount('binance_pay', rows)).toBe(1);
    expect(addedCount('fawry_transfer', rows)).toBe(0);
  });
});
