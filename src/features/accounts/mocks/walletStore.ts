// The dev mock store of the wallets of every account: a balance, a hold and a statement per account, and the top-ups the Deposits tab
// lists. A merchant starts with the demo's wallet (balance, held amount, credit limit, and the statement the ledger already holds); the
// first two accounts with a login of the shop kind have a credited $50 top-up and a top-up waiting for review, as the backend's
// development seed leaves them. Amounts are kept in whole ten-thousandths so sums are exact. The mock fakes answers and simple state
// changes; the real server owns the rules (decision 014). Dev and tests only.
import type { CustomerWalletRow } from '@/features/finance';
import { ledgerStore, postLedger } from '@/mocks/ledger';
import type { LedgerRefType } from '@/features/finance';
import type { MockSettings } from '@/mocks/settings';
import { toIso, toMoney } from '@/mocks/seed';
import type { AccountWallet, StatementRow, WalletHold, WalletKind } from '../types';
import { statementOf } from './figures';
import { ledgerOwnerOf } from './links';
import { accountState } from './store';
import type { AccountState, MockAccount } from './types';

const UNIT = 10_000;
const DAY = 86_400_000;

export const toUnits = (amount: string | number): number => Math.round(Number(amount) * UNIT);
export const fromUnits = (units: number): string => toMoney(units / UNIT);

/** The demo's limit above which a merchant wallet adjustment needs a second approver. */
export const MERCHANT_APPROVAL_LIMIT = 10_000;
/** The limit of a store balance when the settings name none. */
const STORE_APPROVAL_LIMIT = 500;

/**
 * A top-up of a store balance, as the Deposits tab and the statement see it. `invoiceId` continues the Finance mock's invoice numbering
 * (the demo seed ends at 69), so the next invoice staff issue in the dev layer is the 72nd.
 */
export type MockTopUp = {
  id: number;
  accountId: number;
  /** The account's name and email, so the Deposits and Invoices mocks need not read the accounts store. */
  account: { id: number; name: string; email: string };
  invoiceId: number;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  gateway: { id: number; name: string };
  reference: string;
  receiptFileId: number | null;
  createdAt: string;
};

/** What one wallet holds, in ten-thousandths of a dollar. A wallet with no entry holds nothing. */
type Wallet = {
  balance: number;
  reserved: number;
  creditLimit: number;
  hold: WalletHold | null;
  changedAt: string | null;
};

/** The answer kept for a used Idempotency-Key: the request it was made for and what was answered. */
type Replay = { fingerprint: string; answer: unknown };

export type WalletState = {
  wallets: Map<number, Wallet>;
  statements: Map<number, StatementRow[]>;
  topUps: MockTopUp[];
  replays: Map<string, Replay>;
  /** Seeded statement lines whose journal is not in the shared ledger yet (it is posted the first time it is needed). */
  unposted: Map<number, { row: StatementRow; paymentId: number }>;
};

let rowSeq = 810_000;

const emptyWallet = (): Wallet => ({ balance: 0, reserved: 0, creditLimit: 0, hold: null, changedAt: null });

async function seed(state: AccountState): Promise<WalletState> {
  const ledger = (await ledgerStore()).list();
  const now = Date.now();
  const wallets = new Map<number, Wallet>();
  const statements = new Map<number, StatementRow[]>();
  const result: WalletState = { wallets, statements, topUps: [], replays: new Map(), unposted: new Map() };

  for (const [id, opening] of state.openingWallets) {
    wallets.set(id, {
      balance: toUnits(opening.balance),
      reserved: toUnits(opening.reserved),
      creditLimit: toUnits(opening.creditLimit),
      hold: null,
      changedAt: null,
    });
    const merchant = state.accounts.find(id);
    if (merchant) statements.set(id, statementOf(ledgerOwnerOf(merchant, 'merchant'), ledger));
  }

  const holders = state.accounts
    .list()
    .filter((a) => a.legacy?.type === 'customer' && a.hasAccount && a.status === 'active')
    .slice(0, 2);
  const [credited, waiting] = holders;
  if (credited) {
    const at = toIso(now - 6 * DAY);
    const row: StatementRow = {
      id: ++rowSeq,
      transactionId: 0,
      kind: 'deposit',
      memo: 'Top-up PAY-2001 (CliQ transfer)',
      amount: fromUnits(50 * UNIT),
      balanceAfter: fromUnits(50 * UNIT),
      createdAt: at,
    };
    wallets.set(credited.id, { ...emptyWallet(), balance: 50 * UNIT, changedAt: at });
    statements.set(credited.id, [row]);
    result.unposted.set(credited.id, { row, paymentId: 2001 });
    result.topUps.push({
      id: 2001,
      accountId: credited.id,
      account: { id: credited.id, name: credited.name, email: credited.email },
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
    result.topUps.push({
      id: 2002,
      accountId: waiting.id,
      account: { id: waiting.id, name: waiting.name, email: waiting.email },
      invoiceId: 71,
      status: 'pending',
      amount: 50,
      gateway: { id: 9, name: 'CliQ transfer' },
      reference: 'CLIQ-77184',
      receiptFileId: 9202,
      createdAt: toIso(now - 3 * 3_600_000),
    });
  }
  return result;
}

let state: Promise<WalletState> | undefined;

/** The wallet data, seeded from the accounts on first use. Handlers change it in place. */
export function walletState(): Promise<WalletState> {
  state ??= accountState().then(seed);
  return state;
}

/** Drops the data so the next use re-seeds it (tests). */
export function resetWalletStore(): void {
  state = undefined;
  rowSeq = 810_000;
}

/** The wallet of an account, which holds nothing until something is posted. */
export function walletOfState(wallets: WalletState, accountId: number): Wallet {
  return wallets.wallets.get(accountId) ?? emptyWallet();
}

/** The settings the wallet figures read: the shop's master switch and the approval limit of a store balance. */
export function storeSettings(settings: MockSettings): { enabled: boolean; approvalLimit: number } {
  const limit = settings['wallet.customer.adjust_approval_limit'];
  return {
    enabled: settings['wallet.customer.enabled'] === true,
    approvalLimit: typeof limit === 'number' ? limit : STORE_APPROVAL_LIMIT,
  };
}

/**
 * The live wallet as `GET /admin/clients/:id/wallet` sends it. A merchant wallet adds the credit limit to what is available; a store
 * balance has no credit, and nothing is spendable while it is on hold, switched off or negative. `creditAllowed` is the rank's.
 */
export function walletView(
  wallets: WalletState,
  settings: MockSettings,
  account: Pick<MockAccount, 'id'>,
  kind: WalletKind,
  creditAllowed: boolean,
): AccountWallet {
  const wallet = walletOfState(wallets, account.id);
  const store = storeSettings(settings);
  const waiting = wallets.topUps.filter((t) => t.accountId === account.id && t.status === 'pending');
  const merchant = kind === 'merchant';
  return {
    kind,
    currency: 'USD',
    balance: fromUnits(wallet.balance),
    reserved: fromUnits(merchant ? wallet.reserved : 0),
    creditLimit: fromUnits(merchant ? wallet.creditLimit : 0),
    available: fromUnits(
      merchant
        ? wallet.balance + wallet.creditLimit
        : wallet.hold || !store.enabled || wallet.balance < 0
          ? 0
          : wallet.balance,
    ),
    creditAllowed: merchant && creditAllowed,
    adjustApprovalLimit: toMoney(merchant ? MERCHANT_APPROVAL_LIMIT : store.approvalLimit),
    frozen: wallet.hold,
    enabled: merchant ? true : store.enabled,
    pendingTopUps: {
      count: waiting.length,
      amount: fromUnits(waiting.reduce((sum, t) => sum + toUnits(t.amount), 0)),
    },
    openDisputes: 0,
  };
}

type Posting = {
  account: MockAccount;
  kind: WalletKind;
  /** The journal's kind: `adjustment`, `deposit`. */
  journalKind: string;
  memo: string;
  /** Signed from the account's side: positive adds to the balance. */
  units: number;
  by: string;
  /** The payment a top-up is about; an adjustment has none. */
  paymentId?: number;
  /** The account on the other side: `bank` for a top-up, `adjustments` for a staff adjustment. */
  otherKind: string;
};

/** Posts one journal on the shared ledger: the account's wallet against a bank (credit) or adjustments (either way). */
async function postJournal(post: Posting): Promise<number> {
  const { account, units } = post;
  const amount = units / UNIT;
  const owner = ledgerOwnerOf(account, post.kind);
  const entry = await postLedger({
    kind: post.journalKind,
    memo: post.memo,
    orderId: post.paymentId ?? account.id,
    by: post.by,
    lines: [
      { kind: post.otherKind, amount },
      {
        kind: post.kind === 'merchant' ? 'client_wallet' : 'customer_wallet',
        ...owner,
        ownerName: account.name,
        amount: -amount,
      },
    ],
  });
  // A merchant adjustment is about the merchant; a store adjustment goes out as `system`; a top-up is about its payment.
  entry.refType = (
    post.paymentId ? 'payment' : post.kind === 'merchant' ? 'merchant' : 'system'
  ) as LedgerRefType;
  if (!post.paymentId && post.kind === 'merchant') entry.refId = account.id;
  return entry.id;
}

/** Moves the account's balance by `units` (positive adds), posts the journal, and appends the statement line. Returns the journal's id. */
export async function postToWallet(post: Posting): Promise<number> {
  const wallets = await walletState();
  const id = await postJournal(post);
  const current = walletOfState(wallets, post.account.id);
  const balance = current.balance + post.units;
  const at = new Date().toISOString();
  wallets.wallets.set(post.account.id, { ...current, balance, changedAt: at });
  wallets.statements.set(post.account.id, [
    ...(wallets.statements.get(post.account.id) ?? []),
    {
      id: ++rowSeq,
      transactionId: id,
      kind: post.journalKind,
      memo: post.memo,
      amount: fromUnits(post.units),
      balanceAfter: fromUnits(balance),
      createdAt: at,
    },
  ]);
  return id;
}

/** Changes what a wallet holds that is not the balance (the credit limit, the hold). */
export async function patchWallet(accountId: number, changes: Partial<Wallet>): Promise<void> {
  const wallets = await walletState();
  wallets.wallets.set(accountId, {
    ...walletOfState(wallets, accountId),
    ...changes,
    changedAt: new Date().toISOString(),
  });
}

/** The top-ups of an account (every account's when `accountId` is left out), for the Deposits mock. */
export async function accountTopUps(accountId?: number): Promise<MockTopUp[]> {
  const { topUps } = await walletState();
  return topUps.filter((topUp) => accountId === undefined || topUp.accountId === accountId);
}

/** Moves a top-up to a new status (the Deposits mock approves and rejects). */
export async function markTopUp(id: number, status: MockTopUp['status']): Promise<void> {
  const topUp = (await walletState()).topUps.find((candidate) => candidate.id === id);
  if (topUp) topUp.status = status;
}

/** Credits an approved top-up to the account's balance (no fee on a store top-up in the mock). */
export async function creditTopUp(topUpId: number, by: string): Promise<void> {
  const wallets = await walletState();
  const topUp = wallets.topUps.find((candidate) => candidate.id === topUpId);
  const account = (await accountState()).accounts.find(topUp?.accountId ?? 0);
  if (!topUp || !account) return;
  await postToWallet({
    account,
    kind: 'store',
    journalKind: 'deposit',
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
  const wallets = await walletState();
  const accounts = (await accountState()).accounts;
  for (const [accountId, { row, paymentId }] of [...wallets.unposted]) {
    const account = accounts.find(accountId);
    wallets.unposted.delete(accountId);
    if (!account) continue;
    row.transactionId = await postJournal({
      account,
      kind: 'store',
      journalKind: 'deposit',
      memo: row.memo,
      units: toUnits(row.amount),
      by: 'System',
      paymentId,
      otherKind: 'bank',
    });
  }
}

/**
 * Every account with a store balance or a hold, as `GET /admin/customer-wallets` sends a row (the Finance mock filters and sorts
 * them). `customer.id` is the account id.
 */
export async function storeBalanceRows(): Promise<CustomerWalletRow[]> {
  const wallets = await walletState();
  const { accounts, ranks } = await accountState();
  return accounts.list().flatMap((account) => {
    const wallet = walletOfState(wallets, account.id);
    const retail = ranks.find(account.rankId)?.rankKind !== 'merchant';
    if (!retail || !wallets.wallets.has(account.id)) return [];
    return [
      {
        customer: { id: account.id, name: account.name, email: account.email, status: account.status },
        balance: fromUnits(wallet.balance),
        frozen: wallet.hold,
        updatedAt: wallet.changedAt ?? account.createdAt,
      },
    ];
  });
}
