// Tests for the shop price form's pure parts: where it starts from, the hint on a typed price, the server's words for how a price is set,
// and what a save sends (the rule and a typed price never go in one request).
import { describe, expect, it, vi } from 'vitest';
import type { ServiceListing } from '../../types';
import { priceDefaults, priceProblem, ruleHint, savePriceForm } from './priceForm';

const listing: ServiceListing = {
  id: 5,
  serviceId: 5,
  slug: 'att-unlock',
  publicTitle: 'AT&T Unlock',
  summary: '',
  etaText: '',
  brand: 'Apple',
  carrier: '',
  country: '',
  sort: 2,
  seoTitle: '',
  seoDescription: '',
  isListed: true,
  isFeatured: false,
  listedAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  imageUrl: null,
  service: { id: 5, name: 'AT&T', code: 'IMEI-ATT', basePrice: '17.2800', cost: '13.5000' },
  retailPrice: '25.9900',
  retailPriceSource: 'manual',
  retailPriceRule: null,
  retailPriceWaiting: false,
  floorPrice: '19.0100',
  marginPct: '48.0569',
  orders30d: 0,
  revenue30d: '0.0000',
  locked: false,
  lockedReason: null,
};
const priced = (patch: Partial<ServiceListing>): ServiceListing => ({ ...listing, ...patch });

describe('priceDefaults', () => {
  it('starts a typed price on "Type a price" with the price as the input shows it', () => {
    expect(priceDefaults(listing)).toEqual({ mode: 'type', retailPrice: '25.99' });
  });

  it('starts a price a rule wrote on "Follow the rule"', () => {
    expect(priceDefaults(priced({ retailPrice: '19.9900', retailPriceSource: 'rule' }))).toEqual({
      mode: 'rule',
      retailPrice: '19.99',
    });
  });

  it('starts with an empty price when the listing has none', () => {
    expect(priceDefaults(priced({ retailPrice: null, retailPriceSource: null }))).toEqual({
      mode: 'type',
      retailPrice: '',
    });
  });
});

describe('priceProblem', () => {
  const type = (retailPrice: string) => priceProblem({ mode: 'type', retailPrice });

  it('has no objection when the price follows the rule, whatever the box holds', () => {
    expect(priceProblem({ mode: 'rule', retailPrice: '' })).toBe(true);
  });

  it('accepts a price above zero', () => {
    expect(type('12.5')).toBe(true);
    expect(type('0.0125')).toBe(true);
  });

  it('asks for a price above zero for nothing, zero and words', () => {
    for (const text of ['', '0', '0.00', 'abc', '1,5']) {
      expect(type(text)).toBe('Enter a price greater than zero.');
    }
  });
});

describe('ruleHint', () => {
  it('names the rule that prices the service now', () => {
    expect(
      ruleHint(priced({ retailPriceSource: 'rule', retailPriceRule: { id: 2, label: 'IMEI +30%' } })),
    ).toBe('Priced now by: IMEI +30%.');
  });

  it('says the server keeps a price up to date when no rule wrote it', () => {
    expect(ruleHint(listing)).toBe('The server prices it from the cost and keeps it up to date.');
  });

  it('adds the sentence about a price change that waits', () => {
    expect(ruleHint(priced({ retailPriceWaiting: true }))).toBe(
      'The server prices it from the cost and keeps it up to date. A price change waits for your approval on the Shop price rules tab of the Catalog settings.',
    );
  });
});

describe('savePriceForm', () => {
  const actions = () => ({ follow: vi.fn().mockResolvedValue({}), setPrice: vi.fn().mockResolvedValue({}) });

  it('asks the server to follow the rule and sends no price', async () => {
    const { follow, setPrice } = actions();
    const sent = await savePriceForm({ mode: 'rule', retailPrice: '30.00' }, listing, { follow, setPrice });
    expect(sent).toBe(true);
    expect(follow).toHaveBeenCalledWith(listing);
    expect(setPrice).not.toHaveBeenCalled();
  });

  it('sends a typed price as the API’s money text and no rule', async () => {
    const { follow, setPrice } = actions();
    const sent = await savePriceForm({ mode: 'type', retailPrice: '30' }, listing, { follow, setPrice });
    expect(sent).toBe(true);
    expect(setPrice).toHaveBeenCalledWith({ listing, retailPrice: '30.0000' });
    expect(follow).not.toHaveBeenCalled();
  });

  it('sends nothing for the price that is already typed', async () => {
    const { follow, setPrice } = actions();
    const sent = await savePriceForm({ mode: 'type', retailPrice: '25.99' }, listing, { follow, setPrice });
    expect(sent).toBe(false);
    expect(follow).not.toHaveBeenCalled();
    expect(setPrice).not.toHaveBeenCalled();
  });

  it('sends the same figure when a rule wrote it: typing it stops the price following', async () => {
    const { follow, setPrice } = actions();
    const ruled = priced({ retailPriceSource: 'rule', retailPriceRule: { id: 3, label: 'Rule' } });
    const sent = await savePriceForm({ mode: 'type', retailPrice: '25.99' }, ruled, { follow, setPrice });
    expect(sent).toBe(true);
    expect(setPrice).toHaveBeenCalledWith({ listing: ruled, retailPrice: '25.9900' });
    expect(follow).not.toHaveBeenCalled();
  });

  it('lets a refusal of the server reach the caller', async () => {
    const setPrice = vi.fn().mockRejectedValue(new Error('Below the floor.'));
    await expect(
      savePriceForm({ mode: 'type', retailPrice: '1' }, listing, { follow: vi.fn(), setPrice }),
    ).rejects.toThrow('Below the floor.');
  });
});
