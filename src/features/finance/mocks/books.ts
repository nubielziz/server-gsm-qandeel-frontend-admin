// Mock books: the trial balance and the merchants' wallets, worked out from the shared ledger store (`@/mocks/ledger`) in whole
// ten-thousandths so the totals add up exactly, as the real server's would. Mock data only (decision 014): the real balances
// are the server's. A deposit approved in the mock posts to that store, so these figures follow it.
import { ledgerStore } from '@/mocks/ledger';
import { demoNumericId, demoRows, loadDemoState, toMoney } from '@/mocks/seed';
import type { TrialBalance, WalletExposure, WalletExposureRow } from '../types';

const UNIT = 10_000;
const units = (amount: string): number => Math.round(Number(amount) * UNIT);
const money = (amount: number): string => toMoney(amount / UNIT);

/** The trial balance: every account kind with its signed balance (positive is a debit) and the debit and credit totals. */
export async function trialBalanceOf(): Promise<TrialBalance> {
  const ledger = await ledgerStore();
  const kinds = new Map<string, { balance: number; accounts: Set<number> }>();
  for (const entry of ledger.list()) {
    for (const line of entry.entries) {
      const kind = kinds.get(line.account.kind) ?? { balance: 0, accounts: new Set<number>() };
      kind.balance += units(line.amount);
      kind.accounts.add(line.account.id);
      kinds.set(line.account.kind, kind);
    }
  }
  let debit = 0;
  let credit = 0;
  const rows = [...kinds].map(([kind, { balance, accounts }]) => {
    if (balance > 0) debit += balance;
    else credit -= balance;
    return { kind, balance: money(balance), accounts: accounts.size };
  });
  return { currency: 'USD', rows, totalDebit: money(debit), totalCredit: money(credit) };
}

type DemoMerchant = { id: string; name: string; credit: number };

/** What each merchant's wallet holds now (and the amount reserved for open orders), by merchant id, in ten-thousandths. */
export async function walletsOf(): Promise<Map<number, { balance: number; reserved: number }>> {
  const ledger = await ledgerStore();
  const wallets = new Map<number, { balance: number; reserved: number }>();
  for (const entry of ledger.list()) {
    for (const line of entry.entries) {
      const { kind, ownerType, ownerId } = line.account;
      if (ownerType !== 'client' || ownerId === null) continue;
      if (kind !== 'client_wallet' && kind !== 'client_hold') continue;
      const wallet = wallets.get(ownerId) ?? { balance: 0, reserved: 0 };
      // Both are liabilities, so a credit (negative line) is money the merchant holds.
      if (kind === 'client_wallet') wallet.balance -= units(line.amount);
      else wallet.reserved -= units(line.amount);
      wallets.set(ownerId, wallet);
    }
  }
  return wallets;
}

/** The wallet exposure report: totals and the largest wallets first (at most 50). The overdraft allowed is the merchant's credit. */
export async function exposureOf(): Promise<WalletExposure> {
  const [wallets, state] = await Promise.all([walletsOf(), loadDemoState()]);
  const merchants = new Map(
    demoRows<DemoMerchant>(state, 'merchants').map((merchant) => [demoNumericId(merchant.id), merchant]),
  );
  const people = [...wallets].flatMap(([clientId, wallet]) => {
    const merchant = merchants.get(clientId);
    if (!merchant) return [];
    const limit = Math.round(merchant.credit * UNIT);
    const used = wallet.balance < 0 ? Math.min(-wallet.balance, limit) : 0;
    return [{ clientId, name: merchant.name, ...wallet, limit, used }];
  });
  people.sort((a, b) => b.balance - a.balance);

  const total = (pick: (person: (typeof people)[number]) => number) =>
    people.reduce((sum, person) => sum + pick(person), 0);
  const rows: WalletExposureRow[] = people.slice(0, 50).map((person) => ({
    clientId: person.clientId,
    name: person.name,
    balance: money(person.balance),
    reserved: money(person.reserved),
    overdraftLimit: money(person.limit),
    overdraftUsed: money(person.used),
  }));
  return {
    currency: 'USD',
    totals: {
      clients: people.length,
      balance: money(total((person) => person.balance)),
      reserved: money(total((person) => person.reserved)),
      overdraftLimit: money(total((person) => person.limit)),
      overdraftUsed: money(total((person) => person.used)),
      inOverdraft: people.filter((person) => person.balance < 0).length,
    },
    rows,
  };
}
