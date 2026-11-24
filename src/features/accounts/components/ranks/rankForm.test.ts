// Tests for the rank form's logic: the percent and the deposit limit read from what was typed, the values of a rank, the body of a create and the
// changed fields only of an update, and the messages of the three field rules. Ports the percent cases of the old amount tests and the body
// cases of the old group dialog tests.
import { describe, expect, it } from 'vitest';
import { rank } from '../../test/fixtures';
import {
  changesOf,
  cleanName,
  createBody,
  depositInput,
  depositProblem,
  nameProblem,
  NEW_RANK,
  parseDeposit,
  parsePercent,
  percentInput,
  percentProblem,
  plainDecimal,
  rankValues,
  type RankValues,
} from './rankForm';

const retail = rank({ id: 4, name: 'Storefront retail', kind: 'b2c_retail', rankKind: 'retail' });
const wholesale = rank({
  id: 2,
  name: 'Wholesale',
  discountPercent: '4.0000',
  depositLimit: '20000.0000',
  overdraftAllowed: true,
});
const values = (over: Partial<RankValues> = {}): RankValues => ({ ...rankValues(wholesale), ...over });

describe('parsePercent', () => {
  it('reads a percent with up to two decimals, with or without the sign', () => {
    expect(parsePercent('4')).toBe('4');
    expect(parsePercent('2.5%')).toBe('2.5');
    expect(parsePercent(' 4.50 ')).toBe('4.5');
    expect(parsePercent('8 %')).toBe('8');
    expect(parsePercent('0')).toBe('0');
    expect(parsePercent('100')).toBe('100');
    expect(parsePercent('100.00')).toBe('100');
    expect(parsePercent('08')).toBe('8');
  });

  it('refuses a percent above 100, with too many decimals, or not a number', () => {
    for (const text of ['', ' ', 'abc', '101', '100.5', '4.567', '-1', '1,5', '.5', '5.', '1e1']) {
      expect(parsePercent(text), text).toBeNull();
    }
  });
});

describe('parseDeposit', () => {
  it('turns what was typed into the API’s four-decimal text', () => {
    expect(parseDeposit('20000')).toBe('20000.0000');
    expect(parseDeposit('25.5')).toBe('25.5000');
    expect(parseDeposit(' $1,250.25 ')).toBe('1250.2500');
    expect(parseDeposit('50,000')).toBe('50000.0000');
    expect(parseDeposit('007.5')).toBe('7.5000');
  });

  it('allows zero, because a rank may allow no deposit at once', () => {
    expect(parseDeposit('0')).toBe('0.0000');
    expect(parseDeposit('0.00')).toBe('0.0000');
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
      expect(parseDeposit(text), text).toBeNull();
    }
  });

  it('does no float maths, so long amounts keep every digit', () => {
    expect(parseDeposit('123456789012.3456')).toBe('123456789012.3456');
  });
});

describe('writing a figure back into its box', () => {
  it('trims the zeros of a decimal text', () => {
    expect(plainDecimal('4.0000')).toBe('4');
    expect(plainDecimal('04.5000')).toBe('4.5');
    expect(plainDecimal('0.0000')).toBe('0');
    expect(plainDecimal('20000.0000')).toBe('20000');
    expect(plainDecimal('not a number')).toBe('not a number');
  });

  it('writes a percent without extra zeros', () => {
    expect(percentInput('4.0000')).toBe('4');
    expect(percentInput('9.5000')).toBe('9.5');
    expect(percentInput('0.0000')).toBe('0');
  });

  it('writes money the way a person types it, with at least two decimals', () => {
    expect(depositInput('20000.0000')).toBe('20000.00');
    expect(depositInput('12.5000')).toBe('12.50');
    expect(depositInput('0.1250')).toBe('0.125');
    expect(depositInput('7')).toBe('7.00');
    expect(depositInput('oops')).toBe('oops');
  });
});

describe('the values of a rank', () => {
  it('start from the rank as the form shows it', () => {
    expect(rankValues(wholesale)).toEqual({
      name: 'Wholesale',
      discountPercent: '4',
      depositLimit: '20000.00',
      overdraftAllowed: true,
      isDefault: false,
    });
  });

  it('start a new rank with no discount, no deposit limit, no credit and not the default', () => {
    expect(NEW_RANK).toEqual({
      name: '',
      discountPercent: '0',
      depositLimit: '0.00',
      overdraftAllowed: false,
      isDefault: false,
    });
  });
});

describe('createBody', () => {
  it('sends the five fields, the name trimmed and the figures in the API’s text', () => {
    expect(
      createBody({
        name: '  Reseller ',
        discountPercent: '6%',
        depositLimit: '50,000',
        overdraftAllowed: true,
        isDefault: false,
      }),
    ).toEqual({
      name: 'Reseller',
      discountPercent: '6',
      depositLimit: '50000.0000',
      overdraftAllowed: true,
      isDefault: false,
    });
  });

  it('is the same body for an untouched new rank as the server expects, with no upgrade threshold', () => {
    const body = createBody({ ...NEW_RANK, name: 'Reseller' });
    expect(body).toEqual({
      name: 'Reseller',
      discountPercent: '0',
      depositLimit: '0.0000',
      overdraftAllowed: false,
      isDefault: false,
    });
    expect(Object.keys(body).sort()).toEqual(
      ['depositLimit', 'discountPercent', 'isDefault', 'name', 'overdraftAllowed'].sort(),
    );
  });
});

describe('changesOf', () => {
  it('is empty when nothing changed, also when a figure is written another way', () => {
    expect(changesOf(rankValues(wholesale), wholesale)).toEqual({});
    expect(changesOf(values({ discountPercent: '4.0', depositLimit: '20,000' }), wholesale)).toEqual({});
    expect(changesOf(values({ name: ' Wholesale ' }), wholesale)).toEqual({});
  });

  it('sends only the field that changed', () => {
    expect(changesOf(values({ discountPercent: '5' }), wholesale)).toEqual({ discountPercent: '5' });
    expect(changesOf(values({ name: 'Trade' }), wholesale)).toEqual({ name: 'Trade' });
    expect(changesOf(values({ depositLimit: '25000' }), wholesale)).toEqual({ depositLimit: '25000.0000' });
    expect(changesOf(values({ overdraftAllowed: false }), wholesale)).toEqual({ overdraftAllowed: false });
    expect(changesOf(values({ isDefault: true }), wholesale)).toEqual({ isDefault: true });
  });

  it('sends several fields when several changed', () => {
    expect(changesOf(values({ name: 'Trade', discountPercent: '5.5' }), wholesale)).toEqual({
      name: 'Trade',
      discountPercent: '5.5',
    });
  });

  it('never sends a discount, a credit or a default mark for the retail rank', () => {
    const start = rankValues(retail);
    expect(
      changesOf(
        { ...start, discountPercent: '9', overdraftAllowed: true, isDefault: true, depositLimit: '1500' },
        retail,
      ),
    ).toEqual({ depositLimit: '1500.0000' });
    expect(changesOf({ ...start, name: 'Shop' }, retail)).toEqual({ name: 'Shop' });
  });
});

describe('the rules of the fields', () => {
  it('asks for a name, trimmed, of at most sixty characters', () => {
    expect(cleanName('  VIP ')).toBe('VIP');
    expect(nameProblem('VIP')).toBe(true);
    expect(nameProblem('   ')).toBe('Enter a rank name.');
    expect(nameProblem('x'.repeat(60))).toBe(true);
    expect(nameProblem('x'.repeat(61))).toBe('Use 60 characters or fewer.');
  });

  it('says what a percent may be', () => {
    expect(percentProblem('4.5')).toBe(true);
    expect(percentProblem('150')).toBe('Enter a percent from 0 to 100, with up to two decimals.');
  });

  it('says what a deposit limit may be, and allows zero', () => {
    expect(depositProblem('0')).toBe(true);
    expect(depositProblem('20,000.50')).toBe(true);
    expect(depositProblem('twenty')).toBe('Enter an amount like 20000.00.');
  });
});
