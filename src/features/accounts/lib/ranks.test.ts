// Tests for the rank helpers: the kind of a rank read fail-closed, the labels, the default rank, and the sentences of a rank change.
import { describe, expect, it } from 'vitest';
import { rank } from '../test/fixtures';
import {
  defaultMerchantRankId,
  isMerchantRank,
  isRetailRank,
  percentText,
  rankChangeParts,
  rankKindOf,
  rankLabel,
  ranksOfKind,
  retailRank,
} from './ranks';

const retail = rank({ id: 4, name: 'Storefront retail', kind: 'b2c_retail', rankKind: 'retail' });

describe('rankKindOf', () => {
  it('reads the wire’s rankKind first, then the stored kind, and fails closed', () => {
    expect(rankKindOf(rank())).toBe('merchant');
    expect(rankKindOf(retail)).toBe('retail');
    expect(rankKindOf({ kind: 'b2b' })).toBe('merchant');
    expect(rankKindOf({ kind: 'merchant' })).toBe('merchant');
    expect(rankKindOf({ kind: 'b2c_retail' })).toBe('retail');
    // An unknown word never gives merchant rights.
    expect(rankKindOf({ kind: 'platinum' })).toBe('retail');
    expect(rankKindOf('merchant')).toBe('merchant');
    expect(rankKindOf('retail')).toBe('retail');
    expect(rankKindOf('b2b')).toBe('merchant');
    expect(rankKindOf('weird')).toBe('retail');
    expect(rankKindOf(null)).toBe('retail');
    expect(rankKindOf(undefined)).toBe('retail');
  });

  it('tells the shop’s retail rank from a merchant rank', () => {
    expect(isRetailRank(retail)).toBe(true);
    expect(isRetailRank(rank())).toBe(false);
    expect(isMerchantRank(rank())).toBe(true);
    expect(isMerchantRank(retail)).toBe(false);
    expect(isMerchantRank(null)).toBe(false);
  });

  it('keeps the shop’s retail rank out of the merchant ranks, and finds it', () => {
    const ranks = [rank({ id: 1 }), retail, rank({ id: 2 })];
    expect(ranksOfKind(ranks, 'merchant').map((r) => r.id)).toEqual([1, 2]);
    expect(ranksOfKind(ranks, 'retail').map((r) => r.id)).toEqual([4]);
    expect(retailRank(ranks)?.id).toBe(4);
    expect(retailRank([rank()])).toBeUndefined();
  });
});

describe('labels', () => {
  it('writes a rank as the demo did: the name and, with a discount, the discount', () => {
    expect(rankLabel(rank())).toBe('Standard');
    expect(rankLabel(rank({ name: 'Wholesale', discountPercent: '4.0000' }))).toBe('Wholesale (-4%)');
    expect(rankLabel(rank({ name: 'Odd', discountPercent: '2.5000' }))).toBe('Odd (-2.5%)');
  });

  it('writes a percent without extra zeros, and a dash for one it cannot read', () => {
    expect(percentText('4.0000')).toBe('4%');
    expect(percentText('2.50')).toBe('2.5%');
    expect(percentText('x')).toBe('–');
  });

  it('starts a new merchant in the default merchant rank, else the first', () => {
    expect(defaultMerchantRankId([rank({ id: 1 }), rank({ id: 2, isDefault: true })])).toBe(2);
    expect(defaultMerchantRankId([retail, rank({ id: 5 })])).toBe(5);
    expect(defaultMerchantRankId([retail])).toBeUndefined();
    expect(defaultMerchantRankId([])).toBeUndefined();
  });
});

describe('rankChangeParts', () => {
  const money = (amount: string) => `$${Number(amount).toFixed(2)}`;
  const result = { movedAmount: '0.0000', wallet: null, sessionsEnded: 0, apiKeysRevoked: 0 };

  it('says nothing when nothing moved, ended or was revoked', () => {
    expect(rankChangeParts(result, money)).toEqual([]);
  });

  it('names the amount moved to the wallet the account now has', () => {
    const store = { ...result, movedAmount: '40.0000', wallet: { kind: 'store' as const } };
    expect(rankChangeParts(store as never, money)).toEqual(['$40.00 moved to the store balance.']);
    const merchant = { ...result, movedAmount: '50.0000', wallet: { kind: 'merchant' as const } };
    expect(rankChangeParts(merchant as never, money)).toEqual(['$50.00 moved to the merchant wallet.']);
  });

  it('counts the sessions ended and the keys revoked, in the singular and the plural', () => {
    expect(rankChangeParts({ ...result, sessionsEnded: 1, apiKeysRevoked: 1 }, money)).toEqual([
      '1 session ended.',
      '1 API key revoked.',
    ]);
    expect(rankChangeParts({ ...result, sessionsEnded: 3, apiKeysRevoked: 2 }, money)).toEqual([
      '3 sessions ended.',
      '2 API keys revoked.',
    ]);
  });
});
