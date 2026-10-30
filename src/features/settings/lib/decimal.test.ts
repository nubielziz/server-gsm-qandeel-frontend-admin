// Tests for the decimal text helpers.
import { describe, expect, it } from 'vitest';
import { isDecimalText, isZero, sameDecimal, trimDecimal } from './decimal';

describe('trimDecimal', () => {
  it('drops zeros the API pads on', () => {
    expect(trimDecimal('0.7900')).toBe('0.79');
    expect(trimDecimal('1.0000')).toBe('1');
    expect(trimDecimal('20.5000')).toBe('20.5');
    expect(trimDecimal('100')).toBe('100');
  });
});

describe('isZero', () => {
  it('knows a zero however it is written', () => {
    expect(isZero('0')).toBe(true);
    expect(isZero('0.0000')).toBe(true);
    expect(isZero(null)).toBe(true);
    expect(isZero(undefined)).toBe(true);
    expect(isZero('0.0001')).toBe(false);
    expect(isZero('10')).toBe(false);
  });
});

describe('isDecimalText and sameDecimal', () => {
  it('accepts plain non-negative decimals only', () => {
    expect(isDecimalText('12')).toBe(true);
    expect(isDecimalText(' 0.79 ')).toBe(true);
    expect(isDecimalText('-1')).toBe(false);
    expect(isDecimalText('1,5')).toBe(false);
    expect(isDecimalText('')).toBe(false);
  });

  it('compares two spellings of one number', () => {
    expect(sameDecimal('2.9', '2.9000')).toBe(true);
    expect(sameDecimal('2.9', '2.91')).toBe(false);
  });
});
