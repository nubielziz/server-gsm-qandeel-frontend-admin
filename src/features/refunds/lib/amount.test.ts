// Tests for the exact amount helpers behind the approve dialog.
import { describe, expect, it } from 'vitest';
import { compareMoney, editableAmount, isPositive, parseAmount } from './amount';

describe('parseAmount', () => {
  it('turns plain decimals into the 4-decimal form without floats', () => {
    expect(parseAmount('7.5')).toBe('7.5000');
    expect(parseAmount('19.99')).toBe('19.9900');
    expect(parseAmount('12')).toBe('12.0000');
    expect(parseAmount('0.1')).toBe('0.1000');
    expect(parseAmount(' $5.25 ')).toBe('5.2500');
    expect(parseAmount('007.50')).toBe('7.5000');
    expect(parseAmount('0.0001')).toBe('0.0001');
  });

  it('refuses anything that is not a plain amount', () => {
    for (const text of ['', ' ', 'abc', '-3', '1,5', '1.23456', '1e3', '.5', '5.', '1.2.3']) {
      expect(parseAmount(text)).toBeNull();
    }
  });
});

describe('compareMoney', () => {
  it('orders amounts exactly, whatever their number of decimals', () => {
    expect(compareMoney('19.9900', '19.99')).toBe(0);
    expect(compareMoney('5', '5.0000')).toBe(0);
    expect(compareMoney('0.1000', '0.0999')).toBe(1);
    expect(compareMoney('10.0000', '9.9999')).toBe(1);
    expect(compareMoney('2.0000', '10.0000')).toBe(-1);
  });

  it('does not suffer from float rounding', () => {
    // 0.1 + 0.2 style traps: the strings compare as written.
    expect(compareMoney('0.3000', '0.30000000000000004')).toBe(0);
    expect(compareMoney('1234567890123.4567', '1234567890123.4566')).toBe(1);
  });
});

describe('isPositive', () => {
  it('is true only above zero', () => {
    expect(isPositive('0.0001')).toBe(true);
    expect(isPositive('0.0000')).toBe(false);
    expect(isPositive('0')).toBe(false);
  });
});

describe('editableAmount', () => {
  it('shows at least two decimals and drops the extra zeros', () => {
    expect(editableAmount('19.9900')).toBe('19.99');
    expect(editableAmount('7.2000')).toBe('7.20');
    expect(editableAmount('19.9950')).toBe('19.995');
    expect(editableAmount('5')).toBe('5.00');
  });
});
