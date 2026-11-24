// Builds what the accounts routes send from the mock stores: the row with its joined rank, wallet figures and order figures, the rank
// with its account count, and the fixed price with its service and rank price. The figures are worked out when asked, so an order
// changed in the orders mock moves the account's counts. The mock plays the server here; the console never does. Dev and tests only.
import { toMoney } from '@/mocks/seed';
import type { AccountPrice, AccountRow, Rank, RankRef } from '../types';
import { lastOrderOf, statsOf } from './figures';
import { context, rankOf, walletKindOf, type Context } from './context';
import type { MockAccount, MockPrice, MockService } from './types';
import { walletOfState, walletView } from './walletStore';

/** The lowest price the mock accepts for a service: cost plus minimum profit. */
export function floorOf(service: MockService): number {
  return Math.round((service.cost + service.minProfit) * 10_000) / 10_000;
}

/** A rank in a row: the id, name, kind, discount and whether it allows credit. */
export function toRankRef(rank: Rank): RankRef {
  return {
    id: rank.id,
    name: rank.name,
    kind: rank.rankKind,
    discountPercent: rank.discountPercent,
    creditAllowed: rank.overdraftAllowed,
  };
}

/** The live wallet of an account as the API sends it. */
export function toWallet(ctx: Context, account: MockAccount) {
  const rank = rankOf(ctx, account);
  return walletView(ctx.wallets, ctx.settings, account, walletKindOf(ctx, account), rank.overdraftAllowed);
}

/** The live wallet of an account by its id, or undefined for an id that is no account (for the finance mocks). */
export async function walletOfAccount(accountId: number) {
  const ctx = await context();
  const account = ctx.state.accounts.find(accountId);
  return account ? toWallet(ctx, account) : undefined;
}

/**
 * The account as the API sends it. `activeSessions` is the live count of open sessions when the sessions mock knows the account (a
 * merchant's), else the seeded number stands. A guest has no `security` and no wallet.
 */
export function toRow(ctx: Context, account: MockAccount): AccountRow {
  const { security, rankId: _rankId, legacy: _legacy, checkoutIp: _checkoutIp, ...rest } = account;
  const rank = rankOf(ctx, account);
  const orders = ctx.orders.get(account.id) ?? [];
  const lastOrderAt = lastOrderOf(orders);
  const live = ctx.sessions.get(account.id);
  const wallet = walletOfState(ctx.wallets, account.id);
  const kind = walletKindOf(ctx, account);
  const row: AccountRow = {
    ...rest,
    rank: toRankRef(rank),
    invitationPending: account.hasAccount && !security.hasPassword && account.status === 'active',
    ordersCount: orders.length,
    lastOrderAt,
    security: account.hasAccount ? { ...security, activeSessions: live ?? security.activeSessions } : null,
    stats: statsOf(orders, lastOrderAt),
  };
  if (account.hasAccount) {
    const view = toWallet(ctx, account);
    row.wallet = {
      kind,
      balance: view.balance,
      reserved: view.reserved,
      creditLimit: view.creditLimit,
      available: view.available,
      frozen: wallet.hold !== null,
    };
  }
  return row;
}

/** The rank with how many accounts are in it (every account, guests too). */
export function toRank(ctx: Pick<Context, 'state'>, rank: Rank): Rank {
  const accountCount = ctx.state.accounts.list().filter((account) => account.rankId === rank.id).length;
  return { ...rank, accountCount };
}

/** A fixed price with the service it is for and what the account would pay without it (the rank's fixed price, else base less the discount). */
export function toPrice(ctx: Pick<Context, 'state'>, row: MockPrice): AccountPrice {
  const service = ctx.state.services.get(row.serviceId);
  const account = ctx.state.accounts.find(row.clientId);
  const rank = account ? ctx.state.ranks.find(account.rankId) : undefined;
  const fixed = account ? ctx.state.rankPrices.get(`${account.rankId}|${row.serviceId}`) : undefined;
  const discounted =
    service && rank ? service.basePrice * (1 - Number(rank.discountPercent) / 100) : undefined;
  const rankPrice = fixed ?? discounted;
  return {
    ...row,
    service: {
      id: row.serviceId,
      name: service?.name ?? `Service ${row.serviceId}`,
      type: service?.type,
      basePrice: service ? toMoney(service.basePrice) : null,
      floorPrice: service ? toMoney(floorOf(service)) : null,
    },
    groupPrice: rankPrice === undefined ? null : toMoney(rankPrice),
  };
}
