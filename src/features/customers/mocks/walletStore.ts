// The dev mock store of the customers' store balances (feature 21): a balance, a hold and a statement per customer, and the top-ups
// the Deposits tab lists. Seeded like the backend's development seed: the first two customers with an active account have a
// credited $50 top-up and a top-up waiting for review. Amounts are kept in whole ten-thousandths so sums are exact. The mock fakes
// answers and simple state changes; the real server owns the rules (decision 014). Dev and tests only.
import { postLedger } from '@/mocks/ledger';
import { settingsStore } from '@/mocks/settings';
import { toIso, toMoney } from '@/mocks/seed';
import type { CustomerWalletRow } from '@/features/finance';
import type { CustomerWallet, WalletHold, WalletStatementRow } from '../types';
import { customerState } from './store';
import type { MockCustomer } from './types';

const UNIT = 10_000;
const DAY = 86_400_000;

export const toUnits = (amount: string | number): number => Math.round(Number(amount) * UNIT);
export const fromUnits = (units: number): string => toMoney(units / UNIT);

/**
 * A top-up of a customer's balance, as the Deposits tab and the statement see it. `invoiceId` continues the Finance mock's invoice
 * numbering (the demo seed ends at 69), so the next invoice staff issue in the dev layer is the 72nd.
 */
export type MockTopUp = {
  id: number;
  customerId: number;
  /** The customer's name and email, so the Deposits and Invoices mocks need not read the customers store. */
  customer: { id: number; name: string; email: string };
  invoiceId: number;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  gateway: { id: number; name: string };
  reference: string;
  receiptFileId: number | null;
  createdAt: string;
};

/** The answer kept for a used Idempotency-Key: the request it was made for and what was answered. */
type Replay = { fingerprint: string; answer: { transactionId: number } };

type WalletState = {
  balances: Map<number, number>;
  holds: Map<number, WalletHold>;
  changedAt: Map<number, string>;
  statements: Map<number, WalletStatementRow[]>;
  topUps: MockTopUp[];
  replays: Map<string, Replay>;
  /** Seeded statement lines whose journal is not in the shared ledger yet (it is posted the first time it is needed). */
  unposted: Map<number, { row: WalletStatementRow; paymentId: number }>;
};

let rowSeq = 810_000;

function seed(customers: readonly MockCustomer[]): WalletState {
  const holders = customers.filter((c) => c.hasAccount && c.status === 'active').slice(0, 2);
  const now = Date.now();
  const state: WalletState = {
    balances: new Map(),
    holds: new Map(),
    changedAt: new Map(),
    statements: new Map(),
    topUps: [],
    replays: new Map(),
    unposted: new Map(),
  };
  const [credited, waiting] = holders;
  if (credited) {
    const at = toIso(now - 6 * DAY);
    const row: WalletStatementRow = {
      id: ++rowSeq,
      transactionId: 0,
      kind: 'deposit',
      memo: 'Top-up PAY-2001 (CliQ transfer)',
      amount: fromUnits(50 * UNIT),
      balanceAfter: fromUnits(50 * UNIT),
      createdAt: at,
    };
    state.balances.set(credited.id, 50 * UNIT);
    state.statements.set(credited.id, [row]);
    state.changedAt.set(credited.id, at);
    state.unposted.set(credited.id, { row, paymentId: 2001 });
    state.topUps.push({
      id: 2001,
      customerId: credited.id,
      customer: { id: credited.id, name: credited.name, email: credited.email },
      invoiceId: 70,
      status: 'approved',
      amount: 50,
      gateway: { id: 9, name: 'CliQ transfer' },
      reference: 'CLIQ-77120',
      receiptFileId: 9201,
      createdAt: at,
    });
  }
  if (waiting) {
    state.topUps.push({
      id: 2002,
      customerId: waiting.id,
      customer: { id: waiting.id, name: waiting.name, email: waiting.email },
      invoiceId: 71,
      status: 'pending',
      amount: 50,
      gateway: { id: 9, name: 'CliQ transfer' },
      reference: 'CLIQ-77184',
      receiptFileId: 9202,
      createdAt: toIso(now - 3 * 3_600_000),
    });
  }
  return state;
}

let state: Promise<WalletState> | undefined;

/** The wallet data, seeded from the customers on first use. Handlers change it in place. */
export function walletState(): Promise<WalletState> {
  state ??= customerState().then((customers) => seed(customers.customers.list()));
  return state;
}

/** Drops the data so the next use re-seeds it (tests). */
export function resetWalletStore(): void {
  state = undefined;
  rowSeq = 810_000;
}

/** The customer's top-ups (every customer's when `customerId` is left out), for the Deposits mock. */
export async function customerTopUps(customerId?: number): Promise<MockTopUp[]> {
  const { topUps } = await walletState();
  return topUps.filter((topUp) => customerId === undefined || topUp.customerId === customerId);
}

/** Moves a top-up to a new status (the Deposits mock approves and rejects). */
export async function markTopUp(id: number, status: MockTopUp['status']): Promise<void> {
  const topUp = (await walletState()).topUps.find((candidate) => candidate.id === id);
  if (topUp) topUp.status = status;
}

/** The wallet as `GET /admin/customers/:id/wallet` sends it. */
export async function walletOf(customerId: number): Promise<CustomerWallet> {
  const wallet = await walletState();
  const settings = await settingsStore();
  const balance = wallet.balances.get(customerId) ?? 0;
  const frozen = wallet.holds.get(customerId) ?? null;
  const enabled = settings['wallet.customer.enabled'] === true;
  const waiting = wallet.topUps.filter((t) => t.customerId === customerId && t.status === 'pending');
  const limit = settings['wallet.customer.adjust_approval_limit'];
  return {
    enabled,
    currency: 'USD',
    balance: fromUnits(balance),
    reserved: fromUnits(0),
    creditLimit: fromUnits(0),
    // Nothing is spendable while the balance is on hold, switched off or negative.
    available: fromUnits(frozen || !enabled || balance < 0 ? 0 : balance),
    frozen,
    pendingTopUps: {
      count: waiting.length,
      amount: fromUnits(waiting.reduce((sum, t) => sum + toUnits(t.amount), 0)),
    },
    openDisputes: 0,
    adjustApprovalLimit: toMoney(typeof limit === 'number' ? limit : 500),
  };
}

type Posting = {
  customer: MockCustomer;
  kind: string;
  memo: string;
  /** Signed from the customer's side: positive adds to the balance. */
  units: number;
  by: string;
  /** The payment a top-up is about; an adjustment has none. */
  paymentId?: number;
  /** The account on the other side: `bank` for a top-up, `adjustments` for a staff adjustment. */
  otherKind: string;
};

/** Posts one journal on the shared ledger: the customer's balance against a bank (credit) or adjustments (either way). */
async function postJournal(post: Posting): Promise<number> {
  const { customer, units } = post;
  const amount = units / UNIT;
  const entry = await postLedger({
    kind: post.kind,
    memo: post.memo,
    orderId: post.paymentId ?? customer.id,
    by: post.by,
    lines: [
      { kind: post.otherKind, amount },
      {
        kind: 'customer_wallet',
        ownerType: 'customer',
        ownerId: customer.id,
        ownerName: customer.name,
        amount: -amount,
      },
    ],
  });
  // A customer adjustment is stored as a `customer` reference and goes out as `system`; a top-up is about its payment.
  entry.refType = post.paymentId ? 'payment' : 'system';
  return entry.id;
}

/**
 * Moves the customer's balance by `units` (positive adds), posts the journal, and appends the statement line. Returns the
 * journal's id.
 */
export async function postToWallet(post: Posting): Promise<number> {
  const wallet = await walletState();
  const id = await postJournal(post);
  const balance = (wallet.balances.get(post.customer.id) ?? 0) + post.units;
  const at = new Date().toISOString();
  wallet.balances.set(post.customer.id, balance);
  wallet.changedAt.set(post.customer.id, at);
  wallet.statements.set(post.customer.id, [
    ...(wallet.statements.get(post.customer.id) ?? []),
    {
      id: ++rowSeq,
      transactionId: id,
      kind: post.kind,
      memo: post.memo,
      amount: fromUnits(post.units),
      balanceAfter: fromUnits(balance),
      createdAt: at,
    },
  ]);
  return id;
}

/** Credits an approved top-up to the customer's balance (no fee on a customer top-up in the mock). */
export async function creditTopUp(topUpId: number, by: string): Promise<void> {
  const wallet = await walletState();
  const topUp = wallet.topUps.find((candidate) => candidate.id === topUpId);
  const customer = (await customerState()).customers.find(topUp?.customerId ?? 0);
  if (!topUp || !customer) return;
  await postToWallet({
    customer,
    kind: 'deposit',
    memo: `Top-up PAY-${topUp.id} (${topUp.gateway.name})`,
    units: toUnits(topUp.amount),
    by,
    paymentId: topUp.id,
    otherKind: 'bank',
  });
  topUp.status = 'approved';
}

/** Makes sure the seeded statement lines have a journal on the shared ledger, so "View journal" opens. */
export async function ensureSeedJournals(): Promise<void> {
  const wallet = await walletState();
  const customers = (await customerState()).customers;
  for (const [customerId, { row, paymentId }] of [...wallet.unposted]) {
    const customer = customers.find(customerId);
    wallet.unposted.delete(customerId);
    if (!customer) continue;
    row.transactionId = await postJournal({
      customer,
      kind: 'deposit',
      memo: row.memo,
      units: toUnits(row.amount),
      by: 'System',
      paymentId,
      otherKind: 'bank',
    });
  }
}

/** Every customer with a balance or a hold, as `GET /admin/customer-wallets` sends a row (the Finance mock filters and sorts them). */
export async function walletRows(): Promise<CustomerWalletRow[]> {
  const wallet = await walletState();
  const customers = (await customerState()).customers;
  const ids = new Set([...wallet.balances.keys(), ...wallet.holds.keys()]);
  return [...ids].flatMap((id) => {
    const customer = customers.find(id);
    if (!customer) return [];
    return [
      {
        customer: { id, name: customer.name, email: customer.email, status: customer.status },
        balance: fromUnits(wallet.balances.get(id) ?? 0),
        frozen: wallet.holds.get(id) ?? null,
        updatedAt: wallet.changedAt.get(id) ?? customer.createdAt,
      },
    ];
  });
}
