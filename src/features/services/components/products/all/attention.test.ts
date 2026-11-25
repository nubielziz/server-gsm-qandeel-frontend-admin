// Tests for the words of the reasons a service needs a person: each reason has its words and a hint, they come in the server's order, a
// service without the key has none, and a reason this console does not know is left out instead of breaking the row. Also the words of
// the reason a service cannot go on the shop.
import { describe, expect, it } from 'vitest';
import type { AttentionReason, Service } from '../../../types';
import { ATTENTION_WORDS, attentionOf, shopBlockOf, stockWordsOf } from './attention';

describe('shopBlockOf', () => {
  it('words each reason the server gives for a service that cannot go on the shop', () => {
    expect(shopBlockOf({ isListed: false, shopBlocked: 'b2b_only' })).toBe('Category closed to shop buyers');
    expect(shopBlockOf({ shopBlocked: 'service_disabled' })).toBe('Service switched off');
    expect(shopBlockOf({ isListed: false, shopBlocked: 'category_inactive' })).toBe('Category switched off');
    expect(shopBlockOf({ isListed: false, shopBlocked: 'not_orderable' })).toBe('Cannot be sold on the shop');
  });

  it('says nothing when nothing blocks the service, when it is on the shop, or when the role cannot read the shop', () => {
    expect(shopBlockOf({ isListed: false, shopBlocked: null })).toBeNull();
    expect(shopBlockOf({ isListed: true, shopBlocked: 'b2b_only' })).toBeNull();
    expect(shopBlockOf({})).toBeNull();
  });
});

describe('attentionOf', () => {
  it('words each reason the server sent, in the server’s order', () => {
    const reasons: AttentionReason[] = ['below_floor', 'no_supplier', 'publish_failed', 'price_proposal'];
    expect(attentionOf({ attention: reasons }).map((item) => item.word)).toEqual([
      'Below floor',
      'No supplier',
      'Publish failed',
      'Price waiting',
    ]);
  });

  it('gives every reason a hint that says what to do', () => {
    for (const words of Object.values(ATTENTION_WORDS)) expect(words.hint.length).toBeGreaterThan(10);
  });

  it('says nothing for a service the server sent no reason for, or sent no key for', () => {
    expect(attentionOf({ attention: [] })).toEqual([]);
    expect(attentionOf({})).toEqual([]);
  });

  it('leaves out a reason this console does not know', () => {
    const unknown = ['something_new'] as unknown as AttentionReason[];
    expect(attentionOf({ attention: ['no_supplier', ...unknown] }).map((item) => item.reason)).toEqual([
      'no_supplier',
    ]);
  });
});

describe('stockWordsOf', () => {
  const stock: Pick<Service, 'stockDelivery' | 'stockAvailable' | 'attention'> = {
    stockDelivery: true,
    stockAvailable: 0,
    attention: [],
  };

  it('says nothing for a service that is not delivered from code stock', () => {
    expect(stockWordsOf({ ...stock, stockDelivery: false, stockAvailable: 9 })).toBeNull();
    expect(stockWordsOf({ ...stock, stockDelivery: false, attention: ['no_supplier'] })).toBeNull();
  });

  it('counts the codes in stock, in the good tone', () => {
    expect(stockWordsOf({ ...stock, stockAvailable: 12 })).toMatchObject({
      word: 'Codes: 12 in stock',
      tone: 'good',
    });
    expect(stockWordsOf({ ...stock, stockAvailable: 1 })).toMatchObject({
      word: 'Codes: 1 in stock',
      tone: 'good',
    });
  });

  it("reads the server's no_supplier as no codes left, in the critical tone", () => {
    expect(stockWordsOf({ ...stock, attention: ['no_supplier'] })).toMatchObject({
      word: 'No codes in stock',
      tone: 'crit',
    });
  });

  it('works nothing out itself: an empty stock the server did not flag is only a number', () => {
    // A supplier is linked, or the service waits for a person anyway: the server sent no no_supplier, so it is not critical.
    expect(stockWordsOf(stock)).toMatchObject({ word: 'Codes: 0 in stock', tone: 'neutral' });
    expect(stockWordsOf({ ...stock, attention: ['below_floor'] })).toMatchObject({
      word: 'Codes: 0 in stock',
      tone: 'neutral',
    });
  });

  it('gives every wording a hint that says what happens or what to do', () => {
    for (const words of [
      stockWordsOf(stock),
      stockWordsOf({ ...stock, stockAvailable: 3 }),
      stockWordsOf({ ...stock, attention: ['no_supplier'] }),
    ])
      expect(words?.hint.length).toBeGreaterThan(10);
  });
});
