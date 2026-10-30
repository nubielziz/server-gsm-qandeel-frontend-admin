// Tests for the money and decimal text helpers of the forms: they only reshape text and do no arithmetic.
import { describe, expect, it } from 'vitest';
import { isMoneyText, isSignedText, moneyInput, percentText, sameMoney, toMoneyText } from './money';

describe('moneyInput', () => {
  it('shows at least two decimals and drops trailing zeros beyond them', () => {
    expect(moneyInput('13.5000')).toBe('13.50');
    expect(moneyInput('0.1250')).toBe('0.125');
    expect(moneyInput('12.0000')).toBe('12.00');
    expect(moneyInput('7')).toBe('7.00');
    expect(moneyInput(' 0.0500 ')).toBe('0.05');
  });

  it('never cuts a price that has more than two decimals', () => {
    expect(moneyInput('0.0125')).toBe('0.0125');
  });
});

describe('isMoneyText and isSignedText', () => {
  it('accepts plain amounts of up to four decimals', () => {
    for (const text of ['12', '12.5', '0.0125', ' 3 ']) expect(isMoneyText(text)).toBe(true);
  });

  it('rejects signs, letters, separators and long fractions', () => {
    for (const text of ['', '-1', 'abc', '1,5', '1.23456', '.5', '1.']) expect(isMoneyText(text)).toBe(false);
  });

  it('allows a minus sign only in the signed form', () => {
    expect(isSignedText('-0.25')).toBe(true);
    expect(isSignedText('5')).toBe(true);
    expect(isSignedText('+5')).toBe(false);
  });
});

describe('toMoneyText and sameMoney', () => {
  it('pads to four decimals as text', () => {
    expect(toMoneyText('12.5')).toBe('12.5000');
    expect(toMoneyText('12')).toBe('12.0000');
    expect(toMoneyText(' 0.05 ')).toBe('0.0500');
  });

  it('knows the same amount written two ways', () => {
    expect(sameMoney('13.50', '13.5000')).toBe(true);
    expect(sameMoney('13.5', '13.51')).toBe(false);
  });
});

describe('percentText', () => {
  it('drops trailing zeros', () => {
    expect(percentText('2.0000')).toBe('2%');
    expect(percentText('0.2500')).toBe('0.25%');
    expect(percentText('12.50')).toBe('12.5%');
  });
});
