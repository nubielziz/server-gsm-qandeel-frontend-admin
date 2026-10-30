// What the dashboard mock reads. Orders and money balances come from the live mock stores (so completing an order on the
// Orders page moves the dashboard); the other tables come from the demo seed, typed here with only the fields used. The
// mock plays the server and does not change any of it (decision 014).
import { ledgerStore } from '@/mocks/ledger';
import { orderStore, type MockOrder } from '@/mocks/orders';
import { demoRows, loadDemoState, type DemoState } from '@/mocks/seed';

/** A supplier of the demo seed: its health history (one reading an hour) and the balance it must keep. */
export type SeedSupplier = {
  id: string;
  name: string;
  status: 'up' | 'degraded' | 'down';
  enabled: boolean;
  minBalance: number;
  hist: { t: number; ok: number; ms: number }[];
};
export type SeedService = {
  id: string;
  name: string;
  status: string;
  cost: number;
  price: number;
  minProfit: number;
};
export type SeedMerchant = {
  id: string;
  name: string;
  cc: string;
  status: 'active' | 'pending' | 'suspended';
};
export type SeedCustomer = { id: string; name: string; country: string };
export type SeedPayment = { id: string; status: string; net: number; created: number };
export type SeedAccrual = { id: string; agent: string; amount: number; status: string };
export type SeedRefund = { id: string; status: string; amount: number; created: number; note: string };
export type SeedDispute = {
  id: string;
  status: string;
  amount: number;
  fee: number;
  opened: number;
  due: number;
};
export type SeedTicket = {
  id: string;
  subject: string;
  prio: 'high' | 'normal' | 'low';
  status: string;
  created: number;
  firstReplyAt: number | null;
  csat: number | null;
  msgs: { by: string; ts: number }[];
};
export type SeedCurrency = { code: string; updated: number };
export type SeedMonth = { IMEI: number; Server: number; Remote: number; File: number };

export type World = {
  /** The moment this answer is worked out for. */
  now: number;
  orders: MockOrder[];
  suppliers: SeedSupplier[];
  services: SeedService[];
  merchants: SeedMerchant[];
  customers: SeedCustomer[];
  payments: SeedPayment[];
  accruals: SeedAccrual[];
  refunds: SeedRefund[];
  disputes: SeedDispute[];
  tickets: SeedTicket[];
  currencies: SeedCurrency[];
  imeiChecks: { ts: number }[];
  checkouts: { created: number }[];
  /** Twelve months of order counts, oldest first (the demo's synthetic yearly history). */
  monthly: SeedMonth[];
  /** Merchant wallet balance by merchant id, from the ledger (`client_wallet` is a liability: credits are negative). */
  wallets: Map<number, number>;
  /** Supplier prepaid balance by supplier id, from the ledger. */
  prepaid: Map<number, number>;
};

// The seed is read once and kept: the rebased timestamps stay consistent for the whole session.
let seed: Promise<DemoState> | undefined;

/** Forgets the cached seed so the next answer re-reads it (tests). */
export function resetWorld(): void {
  seed = undefined;
}

/** Collects everything the dashboard needs for one answer. */
export async function loadWorld(): Promise<World> {
  seed ??= loadDemoState();
  const [state, orders, ledger] = await Promise.all([seed, orderStore(), ledgerStore()]);
  const wallets = new Map<number, number>();
  const prepaid = new Map<number, number>();
  for (const transaction of ledger.list()) {
    for (const { account, amount } of transaction.entries) {
      if (account.ownerId === null) continue;
      if (account.kind === 'client_wallet' && account.ownerType === 'client') {
        wallets.set(account.ownerId, (wallets.get(account.ownerId) ?? 0) - Number(amount));
      } else if (account.kind === 'supplier_prepaid' && account.ownerType === 'supplier') {
        prepaid.set(account.ownerId, (prepaid.get(account.ownerId) ?? 0) + Number(amount));
      }
    }
  }
  return {
    now: Date.now(),
    orders: orders.list(),
    suppliers: demoRows<SeedSupplier>(state, 'suppliers'),
    services: demoRows<SeedService>(state, 'services'),
    merchants: demoRows<SeedMerchant>(state, 'merchants'),
    customers: demoRows<SeedCustomer>(state, 'customers'),
    payments: demoRows<SeedPayment>(state, 'payments'),
    accruals: demoRows<SeedAccrual>(state, 'accruals'),
    refunds: demoRows<SeedRefund>(state, 'refunds'),
    disputes: demoRows<SeedDispute>(state, 'disputes'),
    tickets: demoRows<SeedTicket>(state, 'tickets'),
    currencies: (state.settings as { currencies?: SeedCurrency[] } | undefined)?.currencies ?? [],
    imeiChecks: demoRows<{ ts: number }>(state, 'imeiChecks'),
    checkouts: demoRows<{ created: number }>(state, 'checkouts'),
    monthly: demoRows<SeedMonth>(state, 'monthly'),
    wallets,
    prepaid,
  };
}
