// The top accounts report for the dev mock: every account that ordered in the period through the door of the scope, with the rank it
// holds, the orders, spend and profit of the period and the balance of its live wallet. Ports merStats() of 11-state.js and the filter and
// sort of topMerchantsPanel() in 40-p-dashboard.js, over the one account that both a merchant and a storefront buyer are now.
import { walletOfAccount } from '@/features/accounts/mocks';
import { demoNumericId, toMoney } from '@/mocks/seed';
import { customerAccountId, merchantAccountId } from '@/mocks/seed/accountIds';
import type { DashboardScope, TopAccount } from '../types';
import { createdAt } from './orderRules';
import { DAY, sumBy } from './util';
import type { World } from './world';

// An anonymized account keeps its orders but is left out of the report; its email is the redacted one (the accounts mock writes it).
const isAnonymized = (email: string): boolean => email.endsWith('@redacted.invalid');

/** The country of each demo account, by account number: a merchant keeps its number, customer `cN` is account `100 + N`. */
function countries(world: World): Map<number, string> {
  return new Map([
    ...world.merchants.map((merchant): [number, string] => [
      merchantAccountId(demoNumericId(merchant.id)),
      merchant.cc,
    ]),
    ...world.customers.map((customer): [number, string] => [
      customerAccountId(demoNumericId(customer.id)),
      customer.country,
    ]),
  ]);
}

/**
 * The accounts that ordered in the period through the door the scope names (all doors, the merchant portal and API, or the
 * storefront), best spend first. The wallet is the live one: a merchant rank reads the ledger like the attention list does, a retail
 * rank reads its store balance from the accounts mock.
 */
export async function topAccounts(
  world: World,
  days: number,
  limit: number,
  scope: DashboardScope,
): Promise<TopAccount[]> {
  const since = world.now - days * DAY;
  const country = countries(world);
  const price = (order: { totalPrice: string }) => Number(order.totalPrice);
  const byAccount = new Map<number, typeof world.orders>();
  for (const order of world.orders) {
    if (scope !== 'all' && order.channel !== scope) continue;
    if (createdAt(order) < since || isAnonymized(order.account.email)) continue;
    byAccount.set(order.account.id, [...(byAccount.get(order.account.id) ?? []), order]);
  }
  const ranked = [...byAccount].map(([id, orders]) => {
    const { account } = orders[0];
    return {
      id,
      name: account.name,
      country: country.get(id) ?? '',
      rank: { id: account.rank.id, name: account.rank.name, kind: account.rank.kind },
      hasAccount: !account.guest,
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
    };
  });
  const top = ranked.sort((a, b) => Number(b.spend) - Number(a.spend)).slice(0, limit);
  return Promise.all(
    top.map(async (row) => ({
      ...row,
      walletBalance:
        row.rank.kind === 'merchant'
          ? toMoney(world.wallets.get(row.id) ?? 0)
          : ((await walletOfAccount(row.id))?.balance ?? toMoney(0)),
    })),
  );
}
