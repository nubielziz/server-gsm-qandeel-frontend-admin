// Tests for the display-only money maths of the order screens.
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import { atStake, orderFx, orderGross, orderProfit, orderTaxRate } from './money';

describe('money maths', () => {
  it('takes the cost off the price for the profit', () => {
    expect(orderProfit(order({ totalPrice: '12.4900', totalCost: '9.8000' }))).toBeCloseTo(2.69);
    expect(orderProfit(order({ totalPrice: '1.0000', totalCost: '2.0000' }))).toBeLessThan(0);
  });

  it('adds VAT to the price for what a storefront customer paid', () => {
    expect(orderGross(order({ totalPrice: '12.4900', taxAmount: '2.5000' }))).toBeCloseTo(14.99);
  });

  it('reads the rate and the VAT from the pricing snapshot, with safe defaults', () => {
    const priced = order({ pricingSnapshot: { fx: 0.79, taxRate: 0.2 } });
    expect(orderFx(priced)).toBe(0.79);
    expect(orderTaxRate(priced)).toBeCloseTo(20);
    expect(orderFx(order({ pricingSnapshot: {} }))).toBe(1);
    expect(orderTaxRate(order({ pricingSnapshot: { taxRate: 'x' } }))).toBe(0);
  });

  it('adds up only the open orders of a selection', () => {
    const selection = [
      order({ status: 'processing', totalPrice: '10.0000' }),
      order({ status: 'pending', totalPrice: '2.5000' }),
      order({ status: 'completed', totalPrice: '99.0000' }),
    ];
    expect(atStake(selection)).toBeCloseTo(12.5);
  });
});
