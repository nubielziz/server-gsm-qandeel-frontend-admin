// Tests for the retail figure the group prices form remembers.
import { describe, expect, it } from 'vitest';
import type { ClientGroup } from '../types';
import { loadedRetailPrice } from './groupPrices';

const GROUPS: ClientGroup[] = [
  { id: 1, name: 'Standard', kind: 'b2b', discountPercent: '0.00' },
  { id: 9, name: 'Storefront retail', kind: 'b2c_retail', discountPercent: '0.00' },
];

describe('loadedRetailPrice', () => {
  it('is the saved price of the retail group, as the server wrote it', () => {
    expect(
      loadedRetailPrice(GROUPS, [
        { groupId: 1, price: '12.0000' },
        { groupId: 9, price: '19.9950' },
      ]),
    ).toBe('19.9950');
  });

  it('is null when the service has no retail price', () => {
    expect(loadedRetailPrice(GROUPS, [{ groupId: 1, price: '12.0000' }])).toBeNull();
    expect(loadedRetailPrice(GROUPS, [])).toBeNull();
  });

  it('is null when the menu lists no retail group, whatever else is saved', () => {
    expect(loadedRetailPrice(GROUPS.slice(0, 1), [{ groupId: 9, price: '19.9950' }])).toBeNull();
  });
});
