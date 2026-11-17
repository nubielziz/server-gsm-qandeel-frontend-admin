// Tests for the gallery helpers: the free code made from a preset key and the count of methods made from a preset.
import { describe, expect, it } from 'vitest';
import { addedCount, freeCode } from './gatewayPresets';

describe('freeCode', () => {
  it('is the key itself while no method uses it', () => {
    expect(freeCode('vodafone_cash', [])).toBe('vodafone_cash');
    expect(freeCode('vodafone_cash', [{ code: 'card' }, { code: 'bank' }])).toBe('vodafone_cash');
  });

  it('takes the first free number when the key is used (two bank accounts)', () => {
    expect(freeCode('bank_transfer', [{ code: 'bank_transfer' }])).toBe('bank_transfer_2');
    expect(freeCode('bank_transfer', [{ code: 'bank_transfer' }, { code: 'bank_transfer_2' }])).toBe(
      'bank_transfer_3',
    );
    expect(freeCode('bank_transfer', [{ code: 'bank_transfer' }, { code: 'bank_transfer_3' }])).toBe(
      'bank_transfer_2',
    );
  });
});

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
