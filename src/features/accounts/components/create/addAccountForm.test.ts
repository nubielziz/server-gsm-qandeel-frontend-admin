// Tests for the form logic of +Add Account: the checks and tidying of what is typed (ports the email and country cases of the old merchants'
// helper tests), the credit limit as text, the choices of the Rank menu, and the body of the create call for a retail account and for a
// merchant rank. The server still validates everything.
import { describe, expect, it } from 'vitest';
import { rank } from '../../test/fixtures';
import {
  addAccountBody,
  addAccountDefaults,
  allowsCredit,
  choiceKind,
  chosenRank,
  cleanCountry,
  cleanEmail,
  cleanName,
  parseCreditLimit,
  rankChoices,
  validCountry,
  validEmail,
  validName,
  type AddAccountValues,
} from './addAccountForm';

const STANDARD = rank({ id: 1, name: 'Standard', isDefault: true });
const WHOLESALE = rank({ id: 2, name: 'Wholesale', discountPercent: '4.0000', overdraftAllowed: true });
const RETAIL = rank({ id: 4, name: 'Storefront retail', kind: 'b2c_retail', rankKind: 'retail' });
const RANKS = [STANDARD, WHOLESALE, RETAIL];

const filled = (over: Partial<AddAccountValues> = {}): AddAccountValues => ({
  ...addAccountDefaults(),
  name: ' Pat   Example ',
  email: ' Pat.Example@Mail.example ',
  phone: ' +49 170 000 ',
  ...over,
});

describe('input hints', () => {
  it('checks the email shape and sends it trimmed and lower case', () => {
    expect(validEmail('owner@example.com')).toBe(true);
    expect(validEmail(' owner@example.com ')).toBe(true);
    expect(validEmail('owner@example')).toBe(false);
    expect(validEmail('owner example.com')).toBe(false);
    expect(cleanEmail(' Ops@Shop.Example ')).toBe('ops@shop.example');
  });

  it('wants two letters for a country and sends them upper case', () => {
    expect(validCountry('jo')).toBe(true);
    expect(validCountry('JOR')).toBe(false);
    expect(validCountry('1a')).toBe(false);
    expect(cleanCountry(' jo ')).toBe('JO');
  });

  it('wants a name of two characters and joins runs of spaces', () => {
    expect(cleanName('  Pat   Example ')).toBe('Pat Example');
    expect(validName('Al')).toBe(true);
    expect(validName(' A ')).toBe(false);
    expect(validName('')).toBe(false);
  });
});

describe('parseCreditLimit', () => {
  it('turns a typed amount into the API text, with no float maths', () => {
    expect(parseCreditLimit('500')).toBe('500.0000');
    expect(parseCreditLimit(' $1,250.25 ')).toBe('1250.2500');
    expect(parseCreditLimit('0')).toBe('0.0000');
    expect(parseCreditLimit('123456789012.3456')).toBe('123456789012.3456');
  });

  it('refuses what is not an amount, instead of guessing', () => {
    for (const text of ['', 'lots', '12,50', '1.23456', '-5', '.5', '5.', '1e3']) {
      expect(parseCreditLimit(text), text).toBeNull();
    }
  });
});

describe('the Rank menu', () => {
  it('starts on the retail choice, with no country chosen and a link to choose the password', () => {
    expect(addAccountDefaults()).toMatchObject({
      rank: 'retail',
      country: '',
      mode: 'reset_link',
      company: '',
      creditLimit: '',
    });
  });

  it('knows which kind a choice is and finds the merchant rank it names', () => {
    expect(choiceKind('retail')).toBe('retail');
    expect(choiceKind('2')).toBe('merchant');
    expect(chosenRank(RANKS, '2')).toBe(WHOLESALE);
    expect(chosenRank(RANKS, 'retail')).toBeUndefined();
    expect(chosenRank(RANKS, '99')).toBeUndefined();
    // The retail rank is not a merchant rank, even when its id is chosen.
    expect(chosenRank(RANKS, '4')).toBeUndefined();
  });

  it('offers the Owner retail first, then the merchant ranks, the default one marked', () => {
    expect(rankChoices(RANKS, true)).toEqual([
      { value: 'retail', label: 'Retail (shop)' },
      { value: '1', label: 'Standard · new merchants start here' },
      { value: '2', label: 'Wholesale (-4%)' },
    ]);
  });

  it('shows a role that is not the Owner the merchant ranks as disabled choices', () => {
    expect(rankChoices(RANKS, false)).toEqual([
      { value: 'retail', label: 'Retail (shop)' },
      { value: '1', label: 'Standard: Owner only', disabled: true },
      { value: '2', label: 'Wholesale: Owner only', disabled: true },
    ]);
  });

  it('offers retail alone when the ranks cannot be listed', () => {
    expect(rankChoices(undefined, true)).toEqual([{ value: 'retail', label: 'Retail (shop)' }]);
    expect(rankChoices([], false)).toEqual([{ value: 'retail', label: 'Retail (shop)' }]);
  });

  it('gives a credit limit only to a merchant rank that allows credit', () => {
    expect(allowsCredit(WHOLESALE)).toBe(true);
    expect(allowsCredit(STANDARD)).toBe(false);
    expect(allowsCredit(RETAIL)).toBe(false);
    expect(allowsCredit(undefined)).toBe(false);
  });
});

describe('addAccountBody', () => {
  it('sends a retail account with no rank, company or credit, whatever was typed', () => {
    const body = addAccountBody(
      filled({ country: 'DE', company: 'Ghost Ltd', creditLimit: '500' }),
      undefined,
      true,
    );
    expect(body).toEqual({
      name: 'Pat Example',
      email: 'pat.example@mail.example',
      country: 'DE',
      phone: '+49 170 000',
      password: { mode: 'reset_link' },
    });
    expect(body).not.toHaveProperty('groupId');
    expect(body).not.toHaveProperty('company');
    expect(body).not.toHaveProperty('creditLimit');
  });

  it('leaves the phone out when it is empty', () => {
    expect(addAccountBody(filled({ phone: '  ' }), undefined, true)).not.toHaveProperty('phone');
  });

  it('sends a merchant rank with its id, the company, the credit limit and the country in capitals', () => {
    expect(
      addAccountBody(
        filled({
          rank: '2',
          country: 'om',
          company: ' Muscat Gadgets ',
          creditLimit: '500',
          mode: 'temporary_password',
        }),
        WHOLESALE,
        true,
      ),
    ).toEqual({
      name: 'Pat Example',
      email: 'pat.example@mail.example',
      country: 'OM',
      phone: '+49 170 000',
      groupId: 2,
      company: 'Muscat Gadgets',
      creditLimit: '500.0000',
      password: { mode: 'temporary_password' },
    });
  });

  it('leaves the credit limit out when the rank allows no credit, the role may not set one, or it is zero or empty', () => {
    const typed = filled({ rank: '2', country: 'OM', creditLimit: '500' });
    expect(addAccountBody(typed, STANDARD, true)).not.toHaveProperty('creditLimit');
    expect(addAccountBody(typed, WHOLESALE, false)).not.toHaveProperty('creditLimit');
    expect(addAccountBody({ ...typed, creditLimit: '0.00' }, WHOLESALE, true)).not.toHaveProperty(
      'creditLimit',
    );
    expect(addAccountBody({ ...typed, creditLimit: '' }, WHOLESALE, true)).not.toHaveProperty('creditLimit');
  });

  it('leaves the company out when it is empty', () => {
    expect(
      addAccountBody(filled({ rank: '1', country: 'OM', company: ' ' }), STANDARD, true),
    ).not.toHaveProperty('company');
  });
});
