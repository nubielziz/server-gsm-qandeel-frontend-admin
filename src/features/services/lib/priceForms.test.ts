// Tests for the text and the request bodies of the two price forms: what the boxes start from, what a save sends, and which saved
// group prices go back unchanged because they have no box.
import { describe, expect, it } from 'vitest';
import type { ClientGroup } from '../types';
import {
  groupDefaults,
  groupFieldOf,
  listedGroups,
  priceChanges,
  priceDefaults,
  readGroupPrices,
} from './priceForms';

const GROUPS: ClientGroup[] = [
  { id: 1, name: 'Standard', kind: 'b2b', discountPercent: '0.00' },
  { id: 2, name: 'Wholesale', kind: 'b2b', discountPercent: '4.00' },
  { id: 9, name: 'Shop retail', kind: 'b2c_retail', discountPercent: '0.00' },
];

describe('priceDefaults and priceChanges', () => {
  const saved = { basePrice: '17.2800', minProfit: '0.8100' };

  it('fills the boxes from the saved prices, with at least two decimals', () => {
    expect(priceDefaults(saved)).toEqual({ basePrice: '17.28', minProfit: '0.81' });
    expect(priceDefaults({ basePrice: '9.0000', minProfit: '0.0125' })).toEqual({
      basePrice: '9.00',
      minProfit: '0.0125',
    });
  });

  it('sends nothing when the boxes still say what is saved, however it is written', () => {
    expect(priceChanges({ basePrice: '17.28', minProfit: '0.81' }, saved)).toEqual({});
    expect(priceChanges({ basePrice: '17.280', minProfit: '0.8100' }, saved)).toEqual({});
  });

  it('sends only the price that changed, as four-decimal text', () => {
    expect(priceChanges({ basePrice: '15', minProfit: '0.81' }, saved)).toEqual({ basePrice: '15.0000' });
    expect(priceChanges({ basePrice: '17.28', minProfit: '5' }, saved)).toEqual({ minProfit: '5.0000' });
    expect(priceChanges({ basePrice: '15', minProfit: '5' }, saved)).toEqual({
      basePrice: '15.0000',
      minProfit: '5.0000',
    });
  });
});

describe('listedGroups', () => {
  it('lists every group for the dialog', () => {
    expect(listedGroups(GROUPS, false).map((group) => group.id)).toEqual([1, 2, 9]);
  });

  it('leaves the retail group out for the panel', () => {
    expect(listedGroups(GROUPS, true).map((group) => group.id)).toEqual([1, 2]);
  });
});

describe('groupDefaults', () => {
  it('fills a box from the saved price of its group and leaves the others blank', () => {
    expect(groupDefaults(GROUPS.slice(0, 2), [{ groupId: 2, price: '16.2500' }])).toEqual({
      [groupFieldOf(GROUPS[0]!)]: '',
      [groupFieldOf(GROUPS[1]!)]: '16.25',
    });
  });
});

describe('readGroupPrices', () => {
  const saved = [
    { groupId: 2, price: '16.2500' },
    { groupId: 9, price: '19.9900' },
    { groupId: 77, price: '3.0000' },
  ];

  it('sends the typed prices in the order of the boxes and skips a blank box', () => {
    const listed = GROUPS.slice(0, 2);
    const read = readGroupPrices({ group_1: ' 12.5 ', group_2: '' }, listed, []);
    expect(read).toEqual({ prices: [{ groupId: 1, price: '12.5000' }] });
  });

  it('sends back the saved price of a group that has no box, the retail group and a group the menu does not list', () => {
    const listed = listedGroups(GROUPS, true);
    const read = readGroupPrices({ group_1: '', group_2: '16.25' }, listed, saved);
    expect(read).toEqual({
      prices: [
        { groupId: 2, price: '16.2500' },
        { groupId: 9, price: '19.9900' },
        { groupId: 77, price: '3.0000' },
      ],
    });
  });

  it('lets the dialog type the retail price: with a box, its saved row is not sent back separately', () => {
    const read = readGroupPrices({ group_1: '', group_2: '', group_9: '21' }, GROUPS, saved);
    expect(read).toEqual({
      prices: [
        { groupId: 9, price: '21.0000' },
        { groupId: 77, price: '3.0000' },
      ],
    });
  });

  it('names the first box that holds something that is not a price above zero', () => {
    const listed = GROUPS.slice(0, 2);
    expect(readGroupPrices({ group_1: '0', group_2: '' }, listed, [])).toEqual({ badField: 'group_1' });
    expect(readGroupPrices({ group_1: '5', group_2: 'abc' }, listed, [])).toEqual({ badField: 'group_2' });
    expect(readGroupPrices({ group_1: '-3', group_2: '' }, listed, [])).toEqual({ badField: 'group_1' });
  });
});
