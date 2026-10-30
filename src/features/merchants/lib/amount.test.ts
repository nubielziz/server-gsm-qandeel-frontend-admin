// Tests for the money and percent parsers behind the dialogs: what typed text becomes, and what is refused.
import { describe, expect, it } from 'vitest';
import { amountInput, parseAmount, parsePercent } from './amount';

describe('parseAmount', () => {
  it('turns typed amounts into the API’s four-decimal text', () => {
    expect(parseAmount('25')).toBe('25.0000');
    expect(parseAmount('25.5')).toBe('25.5000');
    expect(parseAmount(' $1,250.25 ')).toBe('1250.2500');
    expect(parseAmount('0.0001')).toBe('0.0001');
    expect(parseAmount('007.5')).toBe('7.5000');
  });

  it('refuses what is not an amount, instead of guessing', () => {
    for (const text of [
      '',
      ' ',
      'abc',
      '1.23456',
      '-5',
      '12,50',
      '1,2345',
      '1e3',
      '$',
      '.5',
      '5.',
      '1 000',
    ]) {
      expect(parseAmount(text), text).toBeNull();
    }
  });

  it('refuses zero unless the field may be zero (a credit limit of 0 removes the credit)', () => {
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('0.00')).toBeNull();
    expect(parseAmount('0', { allowZero: true })).toBe('0.0000');
    expect(parseAmount('0.00', { allowZero: true })).toBe('0.0000');
  });

  it('does no float maths, so long amounts keep every digit', () => {
    expect(parseAmount('123456789012.3456')).toBe('123456789012.3456');
  });
});

describe('amountInput', () => {
  it('writes money back the way a person types it', () => {
    expect(amountInput('2000.0000')).toBe('2000.00');
    expect(amountInput('12.5000')).toBe('12.50');
    expect(amountInput('0.1250')).toBe('0.125');
    expect(amountInput('7')).toBe('7.00');
  });
});

describe('parsePercent', () => {
  it('reads a percent with up to two decimals, with or without the sign', () => {
    expect(parsePercent('4')).toBe('4');
    expect(parsePercent('2.5%')).toBe('2.5');
    expect(parsePercent(' 4.50 ')).toBe('4.5');
    expect(parsePercent('0')).toBe('0');
    expect(parsePercent('100')).toBe('100');
    expect(parsePercent('08')).toBe('8');
  });

  it('refuses a percent above 100, with too many decimals, or not a number', () => {
    for (const text of ['', 'abc', '101', '100.5', '4.567', '-1', '1,5']) {
      expect(parsePercent(text), text).toBeNull();
    }
  });
});
