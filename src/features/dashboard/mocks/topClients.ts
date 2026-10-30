// The top merchants report for the dev mock: orders, spend and profit of the period, and the wallet balance from the ledger.
// Ports merStats() of 11-state.js and the filter and sort of topMerchantsPanel() in 40-p-dashboard.js.
import { demoNumericId, toMoney } from '@/mocks/seed';
import type { TopClient } from '../types';
import { createdAt } from './orderRules';
import { DAY, sumBy } from './util';
import type { World } from './world';

/** Merchants that are not waiting for approval and ordered in the period, best spend first. */
export function topClients(world: World, days: number, limit: number): TopClient[] {
  const since = world.now - days * DAY;
  return world.merchants
    .filter((merchant) => merchant.status !== 'pending')
    .map((merchant) => {
      const id = demoNumericId(merchant.id);
      const orders = world.orders.filter((order) => order.client?.id === id && createdAt(order) >= since);
      const price = (order: { totalPrice: string }) => Number(order.totalPrice);
      return {
        id,
        name: merchant.name,
        country: merchant.cc,
        orders: orders.length,
        spend: toMoney(
          sumBy(
            orders.filter((order) => order.status !== 'rejected'),
            price,
          ),
        ),
        profit: toMoney(
          sumBy(
            orders.filter((order) => order.status === 'completed'),
            (order) => price(order) - Number(order.totalCost),
          ),
        ),
        walletBalance: toMoney(world.wallets.get(id) ?? 0),
      };
    })
    .filter((client) => client.orders > 0)
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, limit);
}
