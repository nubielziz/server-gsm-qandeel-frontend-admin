// Mock deposits: the demo's `S.payments` as the API's payment DTO (a merchant, a method, an amount, a fee, a status), kept in
// memory so approving and rejecting in the dev layer changes what the Deposits tab shows. Mock data only (decision 014).
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from '@/mocks/seed';
import { walletsOf } from './books';
import type { Payment } from '../types';

/** A payment of the demo seed, as the demo stores it. */
type DemoPayment = {
  id: string;
  mid: string;
  method: 'bank' | 'card' | 'usdt' | 'wise';
  gross: number;
  fee: number;
  net: number;
  status: 'pending' | 'approved' | 'rejected';
  created: number;
  reviewedAt: number | null;
  reviewedBy: string | null;
  ref: string;
  note: string;
  receipt: string | null;
};

type DemoMerchant = { id: string; name: string; group: string };

const GROUP_NAME: Record<string, string> = { std: 'Standard', whl: 'Wholesale', vip: 'VIP' };

// The demo's settings gateways, by the way a merchant pays.
const GATEWAY: Record<DemoPayment['method'], { id: number; name: string }> = {
  card: { id: 1, name: 'Card gateway' },
  usdt: { id: 2, name: 'Crypto gateway' },
  bank: { id: 3, name: 'Bank transfer' },
  wise: { id: 4, name: 'Wise' },
};

/** The invoice a deposit belongs to: the top-up invoices are numbered in the same order as the deposits (PAY-1000 is invoice 1). */
export const topupInvoiceId = (paymentId: number): number => paymentId - 999;

function toPayment(demo: DemoPayment, merchants: Map<string, DemoMerchant>): Payment {
  const merchant = merchants.get(demo.mid);
  const id = demoNumericId(demo.id);
  return {
    id,
    purpose: 'topup',
    status: demo.status,
    methodType: demo.method,
    amount: toMoney(demo.gross),
    feeAmount: toMoney(demo.fee),
    netAmount: toMoney(demo.net),
    currency: 'USD',
    gatewayTxnId: demo.ref,
    capturedAt: demo.status === 'approved' && demo.reviewedAt ? toIso(demo.reviewedAt) : null,
    createdAt: toIso(demo.created),
    invoiceId: topupInvoiceId(id),
    receiptFileId: demo.receipt ? 9000 + id : null,
    client: merchant
      ? {
          id: demoNumericId(merchant.id),
          name: merchant.name,
          group: GROUP_NAME[merchant.group] ?? null,
          walletBalance: null,
        }
      : null,
    gateway: GATEWAY[demo.method],
    reviewedBy: demo.reviewedBy ? { id: null, name: demo.reviewedBy } : null,
    reviewedAt: demo.reviewedAt ? toIso(demo.reviewedAt) : null,
    note: demo.note || null,
  };
}

let store: Promise<Collection<Payment>> | undefined;

/** The deposits, seeded from the demo on first use. Handlers change them in place. */
export function paymentStore(): Promise<Collection<Payment>> {
  store ??= loadDemoState().then((state) => {
    const merchants = new Map(demoRows<DemoMerchant>(state, 'merchants').map((m) => [m.id, m]));
    return new Collection(demoRows<DemoPayment>(state, 'payments').map((p) => toPayment(p, merchants)));
  });
  return store;
}

/**
 * The payments as the API sends them: each merchant's wallet is read from the books now (once for all of them), so it
 * follows every approval.
 */
export async function withWallets(payments: readonly Payment[]): Promise<Payment[]> {
  const wallets = await walletsOf();
  return payments.map((payment) => {
    const wallet = payment.client ? wallets.get(payment.client.id) : undefined;
    if (!payment.client) return payment;
    return {
      ...payment,
      client: { ...payment.client, walletBalance: wallet ? toMoney(wallet.balance / 10_000) : null },
    };
  });
}

/** Drops the store so the next use re-seeds it (tests). */
export function resetPaymentStore(): void {
  store = undefined;
}
