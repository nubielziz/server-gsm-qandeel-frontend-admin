// The figures the accounts mock works out from the other mocks: an account's 30-day numbers from the orders (merStats in 11-state.js)
// and the wallet statement a merchant starts with, from the ledger (merWalletTab in 42-p-merchants.js). Mock data only: the real server
// counts and sums these, and the console never does.
import type { LedgerOwnerType, LedgerTransaction } from '@/features/finance';
import type { Order } from '@/features/orders';
import { toMoney } from '@/mocks/seed';
import type { AccountStats, StatementRow } from '../types';

const DAY_MS = 86_400_000;

/** The last 30 days of one account's orders, counted like the demo's `merStats` (spend ignores rejected orders). */
export function statsOf(orders: readonly Order[], lastOrderAt: string | null): AccountStats {
  const mine = orders.filter((order) => Date.now() - Date.parse(order.createdAt) < 30 * DAY_MS);
  const done = mine.filter((order) => order.status === 'completed');
  const rejected = mine.filter((order) => order.status === 'rejected');
  const total = (list: readonly Order[], pick: (order: Order) => number) =>
    list.reduce((sum, order) => sum + pick(order), 0);
  const spend = total(
    mine.filter((order) => order.status !== 'rejected'),
    (order) => Number(order.totalPrice),
  );
  const profit = total(done, (order) => Number(order.totalPrice) - Number(order.totalCost));
  return {
    orders: mine.length,
    spend: toMoney(spend),
    profit: toMoney(profit),
    margin: spend > 0 ? ((profit / spend) * 100).toFixed(1) : null,
    successRate:
      done.length + rejected.length > 0 ? (done.length / (done.length + rejected.length)) * 100 : null,
    lastOrderAt,
  };
}

/** The newest `createdAt` of some orders, or null. */
export function lastOrderOf(orders: readonly Order[]): string | null {
  return orders.reduce<string | null>(
    (latest, order) =>
      latest === null || Date.parse(order.createdAt) > Date.parse(latest) ? order.createdAt : latest,
    null,
  );
}

/**
 * The statement of one merchant wallet: the ledger entries on their wallet account, oldest first, each with a running balance. The
 * ledger's amounts are signed from the books' side (positive is a debit), so the wallet line is flipped to read from the account's
 * side: a deposit is positive.
 */
export function statementOf(
  owner: { ownerType: LedgerOwnerType; ownerId: number },
  ledger: readonly LedgerTransaction[],
): StatementRow[] {
  const lines = ledger
    .flatMap((transaction) =>
      transaction.entries
        .filter(
          (entry) =>
            entry.account.kind === 'client_wallet' &&
            entry.account.ownerType === owner.ownerType &&
            entry.account.ownerId === owner.ownerId,
        )
        .map((entry) => ({ transaction, entry })),
    )
    .sort(
      (a, b) =>
        Date.parse(a.transaction.createdAt) - Date.parse(b.transaction.createdAt) || a.entry.id - b.entry.id,
    );
  let balance = 0;
  return lines.map(({ transaction, entry }) => {
    const amount = -Number(entry.amount);
    balance = Math.round((balance + amount) * 10_000) / 10_000;
    return {
      id: entry.id,
      transactionId: transaction.id,
      kind: transaction.kind,
      memo: transaction.memo,
      amount: toMoney(amount),
      balanceAfter: toMoney(balance),
      createdAt: transaction.createdAt,
    };
  });
}
