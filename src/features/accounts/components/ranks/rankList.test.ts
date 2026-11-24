// Tests for the pure helpers of the Ranks view: the words of a row, which ranks Delete may take and why not, the links to a rank's accounts and
// to its edit view, and the page of ranks the address names. Ports the rank-kind cases of the old groups helpers that the data layer did not take.
import { describe, expect, it } from 'vitest';
import { rank } from '../../test/fixtures';
import {
  deleteBlocker,
  deleteOffer,
  deleteTitle,
  depositText,
  discountText,
  editRankPath,
  kindWord,
  pageOf,
  parseRanksAddress,
  rankAccountsPath,
} from './rankList';

const retail = rank({
  id: 4,
  name: 'Storefront retail',
  kind: 'b2c_retail',
  rankKind: 'retail',
  accountCount: 21,
});
const used = rank({ id: 3, name: 'VIP', accountCount: 6 });
const unused = rank({ id: 5, name: 'Reseller', accountCount: 0 });

describe('the words of a row', () => {
  it('names the kind', () => {
    expect(kindWord(retail)).toBe('Retail');
    expect(kindWord(used)).toBe('Merchant');
  });

  it('writes a discount without extra zeros, and a dash for the retail rank', () => {
    expect(discountText(rank({ discountPercent: '8.0000' }))).toBe('8%');
    expect(discountText(rank({ discountPercent: '2.5000' }))).toBe('2.5%');
    expect(discountText(rank({ discountPercent: '0.0000' }))).toBe('0%');
    expect(discountText(retail)).toBe('–');
  });

  it('writes a deposit limit as the server sends it: whole dollars when whole, else with its decimals', () => {
    expect(depositText('20000.0000')).toBe('$20,000');
    expect(depositText('1000')).toBe('$1,000');
    expect(depositText('12.5000')).toBe('$12.50');
    expect(depositText('0.1250')).toBe('$0.125');
    expect(depositText('0.0000')).toBe('$0');
    expect(depositText('oops')).toBe('–');
  });
});

describe('what Delete may take', () => {
  it('refuses the retail rank and a rank that still has accounts, with the reasons', () => {
    expect(deleteBlocker(retail)).toBe('The retail rank cannot be deleted');
    expect(deleteBlocker(used)).toBe('Move its accounts to another rank first');
    expect(deleteBlocker(unused)).toBeNull();
  });

  it('leaves the decision to the server when no count is sent', () => {
    expect(deleteBlocker(rank({ accountCount: undefined }))).toBeNull();
  });

  it('counts only the ranks with no account that are not retail, and says why it is off when it takes none', () => {
    const offer = deleteOffer([retail, used, unused]);
    expect(offer.targets.map((r) => r.id)).toEqual([5]);
    expect(offer.skipped.map((s) => [s.rank.id, s.reason])).toEqual([
      [4, 'The retail rank cannot be deleted'],
      [3, 'Move its accounts to another rank first'],
    ]);
    expect(offer.reason).toBeUndefined();
    expect(deleteOffer([retail, used]).reason).toBe('The retail rank cannot be deleted');
    expect(deleteOffer([used]).reason).toBe('Move its accounts to another rank first');
    expect(deleteOffer([])).toEqual({ targets: [], skipped: [], reason: undefined });
  });

  it('asks "Delete N ranks?"', () => {
    expect(deleteTitle(1)).toBe('Delete 1 rank?');
    expect(deleteTitle(3)).toBe('Delete 3 ranks?');
  });
});

describe('addresses', () => {
  it('links the accounts of a merchant rank to the Merchants population, filtered by the rank', () => {
    expect(rankAccountsPath(used)).toBe('/accounts?chip=merchants&rank=3');
  });

  it('links the accounts of the retail rank to the Retail population', () => {
    expect(rankAccountsPath(retail)).toBe('/accounts?chip=retail&rank=4');
  });

  it('links the edit view of a rank', () => {
    expect(editRankPath(7)).toBe('/accounts?view=edit-rank&id=7');
  });

  it('reads the page and the size, and a damaged address as the first page of the default size', () => {
    expect(parseRanksAddress(new URLSearchParams(''))).toEqual({ page: 1, size: 50 });
    expect(parseRanksAddress(new URLSearchParams('page=3&size=25'))).toEqual({ page: 3, size: 25 });
    expect(parseRanksAddress(new URLSearchParams('page=0&size=30'))).toEqual({ page: 1, size: 50 });
    expect(parseRanksAddress(new URLSearchParams('page=x&size=-5'))).toEqual({ page: 1, size: 50 });
    expect(parseRanksAddress(new URLSearchParams('page=2.5&size=200'))).toEqual({ page: 1, size: 200 });
  });
});

describe('pageOf', () => {
  const rows = [1, 2, 3, 4, 5];
  it('cuts the list in pages of the size', () => {
    expect(pageOf(rows, 1, 2)).toEqual([1, 2]);
    expect(pageOf(rows, 3, 2)).toEqual([5]);
  });
  it('gives no rows past the end, and the whole list when it fits', () => {
    expect(pageOf(rows, 4, 2)).toEqual([]);
    expect(pageOf(rows, 1, 50)).toEqual(rows);
  });
});
