// Tests for the wallet dialogs' input helpers: the amount text, the reason, the length check and the Add | Take switch.
import { describe, expect, it } from 'vitest';
import { cleanReason, directionOf, parseWalletAmount, reasonProblem } from './walletInput';

describe('parseWalletAmount', () => {
  it('writes an amount the way the API takes it', () => {
    expect(parseWalletAmount('25')).toBe('25.0000');
    expect(parseWalletAmount('25.5')).toBe('25.5000');
    expect(parseWalletAmount('$1,250.1234')).toBe('1250.1234');
    expect(parseWalletAmount('  007.50 ')).toBe('7.5000');
  });

  it('refuses zero, negatives, a comma decimal and more than four decimals', () => {
    for (const text of ['', '0', '0.0000', '-5', '25,50', '1.23456', 'abc', '1,25']) {
      expect(parseWalletAmount(text), text).toBeNull();
    }
  });
});

describe('cleanReason', () => {
  it('trims and joins runs of spaces', () => {
    expect(cleanReason('  Goodwill   credit \n for a slow unlock ')).toBe(
      'Goodwill credit for a slow unlock',
    );
  });
});

describe('reasonProblem', () => {
  it('counts the length after tidying, as it is sent', () => {
    expect(reasonProblem('  abc  ', 5, 140, 'the entry')).toBe(
      'Add a reason of at least 5 characters so the entry can be audited later.',
    );
    expect(reasonProblem('  ab   cd ', 5, 140, 'the entry')).toBeNull();
    expect(reasonProblem('x'.repeat(141), 5, 140, 'the entry')).toBe(
      'Keep the reason to 140 characters or fewer.',
    );
    expect(reasonProblem('x'.repeat(140), 5, 140, 'the entry')).toBeNull();
  });
});

describe('directionOf', () => {
  it('reads the switch: Add credits the wallet, Take debits it', () => {
    expect(directionOf(true)).toBe('credit');
    expect(directionOf(false)).toBe('debit');
  });
});
