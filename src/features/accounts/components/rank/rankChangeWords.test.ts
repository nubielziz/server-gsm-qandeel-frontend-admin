// Tests for the words of the rank change dialog: how the current rank and the choices read, which ranks are offered and in what order, and
// the three consequence texts (same kind, retail to merchant, merchant to retail) with the credit limit warning.
import { describe, expect, it } from 'vitest';
import { rank } from '../../test/fixtures';
import { currentRankText, rankChoiceLabel, rankChoices, rankConsequence } from './rankChangeWords';

const standard = rank({ id: 1, name: 'Standard', isDefault: true, overdraftAllowed: false, sort: 1 });
const wholesale = rank({
  id: 2,
  name: 'Wholesale',
  discountPercent: '4.0000',
  overdraftAllowed: true,
  sort: 2,
});
const vip = rank({ id: 3, name: 'VIP', discountPercent: '8.0000', overdraftAllowed: true, sort: 3 });
const retail = rank({ id: 4, name: 'Storefront retail', kind: 'b2c_retail', rankKind: 'retail', sort: 4 });
const ALL = [standard, wholesale, vip, retail];

describe('currentRankText', () => {
  it('says "Retail" for the shop\'s rank and "<name>, merchant" for a merchant rank', () => {
    expect(currentRankText({ name: 'Storefront retail', kind: 'retail' })).toBe('Retail');
    expect(currentRankText({ name: 'VIP', kind: 'merchant' })).toBe('VIP, merchant');
  });
});

describe('rankChoices', () => {
  it('offers every rank but the current one, retail first and the merchant ranks in order', () => {
    expect(rankChoices(ALL, 3).map((r) => r.name)).toEqual(['Storefront retail', 'Standard', 'Wholesale']);
    expect(rankChoices(ALL, 4).map((r) => r.name)).toEqual(['Standard', 'Wholesale', 'VIP']);
  });

  it('offers nothing when there is no other rank', () => {
    expect(rankChoices([vip], 3)).toEqual([]);
    expect(rankChoices([], 3)).toEqual([]);
  });
});

describe('rankChoiceLabel', () => {
  it('shows the discount of a merchant rank and marks the one new merchants start in', () => {
    expect(rankChoiceLabel(vip)).toBe('VIP (-8%)');
    expect(rankChoiceLabel(standard)).toBe('Standard · new merchants start here');
    expect(rankChoiceLabel(retail)).toBe('Storefront retail');
  });
});

describe('rankConsequence', () => {
  const wallet = { balance: '1209.7500', creditLimit: '2000.0000' };

  it('says new orders use the new prices when the kind stays the same', () => {
    expect(rankConsequence({ kind: 'merchant' }, wholesale, wallet, true)).toEqual({
      lines: ['New orders use Wholesale prices.'],
      warning: undefined,
      crosses: false,
    });
  });

  it('warns to set the credit limit to 0 first when the target allows no credit and the limit is above zero', () => {
    const result = rankConsequence({ kind: 'merchant' }, standard, wallet, true);
    expect(result.warning).toBe('Set the credit limit to 0 first in Financial.');
    expect(result.crosses).toBe(false);
    expect(
      rankConsequence({ kind: 'merchant' }, standard, { ...wallet, creditLimit: '0.0000' }, true).warning,
    ).toBeUndefined();
    expect(rankConsequence({ kind: 'merchant' }, wholesale, wallet, true).warning).toBeUndefined();
  });

  it('says what retail to merchant does: the balance moves, sessions end, a username is made, a limit comes later', () => {
    const result = rankConsequence(
      { kind: 'retail' },
      vip,
      { balance: '50.0000', creditLimit: '0.0000' },
      true,
    );
    expect(result.crosses).toBe(true);
    expect(result.lines).toEqual([
      'The store balance of $50.00 moves to the merchant wallet.',
      'Every session of the account ends.',
      'A username for the API is made.',
      'Set a credit limit afterwards in Financial if the rank allows credit.',
    ]);
  });

  it('adds the invitation when the account has no password yet', () => {
    const result = rankConsequence(
      { kind: 'retail' },
      vip,
      { balance: '50.0000', creditLimit: '0.0000' },
      false,
    );
    expect(result.lines.at(-1)).toBe('An invitation to set a password goes out.');
  });

  it('says what merchant to retail does: the balance moves, sessions end, keys are revoked, the limit becomes 0', () => {
    const result = rankConsequence({ kind: 'merchant' }, retail, wallet, true);
    expect(result.crosses).toBe(true);
    expect(result.lines).toEqual([
      'The wallet balance of $1,209.75 moves to the store balance.',
      'Every session ends, every API key is revoked and the credit limit becomes 0.',
    ]);
  });

  it('says there is nothing to move for an empty or negative balance, and does not name an amount it could not read', () => {
    expect(
      rankConsequence({ kind: 'retail' }, vip, { balance: '0.0000', creditLimit: '0.0000' }, true).lines[0],
    ).toBe('There is no store balance to move.');
    expect(
      rankConsequence({ kind: 'merchant' }, retail, { balance: '-5.0000', creditLimit: '0.0000' }, true)
        .lines[0],
    ).toBe('There is no wallet balance to move.');
    expect(rankConsequence({ kind: 'merchant' }, retail, undefined, true).lines[0]).toBe(
      'There is no wallet balance to move.',
    );
  });
});
