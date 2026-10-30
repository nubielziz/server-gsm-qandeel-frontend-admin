// Mock invoices. The demo has none, so they are made up from its data (MISMATCHES M123): a top-up invoice for every deposit, three
// manual invoices and the tax receipts of the latest delivered storefront orders. Kept in memory so issuing one in the dev
// layer adds it to the list. Mock data only (decision 014).
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from '@/mocks/seed';
import type { Invoice } from '../types';
import { topupInvoiceId } from './paymentStore';

type DemoPayment = {
  id: string;
  mid: string;
  gross: number;
  fee: number;
  net: number;
  status: 'pending' | 'approved' | 'rejected';
  created: number;
  reviewedAt: number | null;
};
type DemoMerchant = { id: string; name: string; cc: string };
type DemoCustomer = { id: string; name: string; email: string };
type DemoOrder = {
  id: string;
  cid?: string;
  status: string;
  price: number;
  tax?: number;
  taxRate?: number;
  gross?: number;
  country?: string;
  doneAt: number | null;
};

const DAY_MS = 86_400_000;
const STATUS_OF = { approved: 'paid', pending: 'open', rejected: 'void' } as const;

// "INV-2026-0042": the year it was issued and its running number.
export function invoiceNumber(createdAt: string, id: number): string {
  return `INV-${new Date(createdAt).getFullYear()}-${String(id).padStart(4, '0')}`;
}

function topup(payment: DemoPayment, merchants: Map<string, DemoMerchant>): Invoice {
  const id = topupInvoiceId(demoNumericId(payment.id));
  const merchant = merchants.get(payment.mid);
  const createdAt = toIso(payment.created);
  return {
    id,
    number: invoiceNumber(createdAt, id),
    kind: 'topup',
    status: STATUS_OF[payment.status],
    amount: toMoney(payment.gross),
    fee: toMoney(payment.fee),
    netAmount: toMoney(payment.net),
    taxAmount: toMoney(0),
    taxRate: toMoney(0),
    taxCountry: merchant?.cc ?? '',
    customerVatId: '',
    total: toMoney(payment.gross),
    currency: 'USD',
    client: merchant ? { id: demoNumericId(merchant.id), name: merchant.name } : null,
    customer: null,
    orderId: null,
    pdfFileId: payment.status === 'approved' ? 9500 + id : null,
    description: null,
    dueAt: toIso(payment.created + 3 * DAY_MS),
    paidAt: payment.status === 'approved' && payment.reviewedAt ? toIso(payment.reviewedAt) : null,
    createdAt,
  };
}

// Three manual invoices, as staff would have issued them.
function manual(firstId: number, merchants: Map<string, DemoMerchant>, now: number): Invoice[] {
  const specs = [
    { mid: 'm1', amount: 450, days: 21, status: 'paid', what: 'Annual API access fee' },
    { mid: 'm5', amount: 120, days: 9, status: 'open', what: 'Priority support, October' },
    { mid: 'm11', amount: 900, days: 4, status: 'open', what: 'Custom integration work' },
  ] as const;
  return specs.flatMap((spec, index) => {
    const merchant = merchants.get(spec.mid);
    if (!merchant) return [];
    const id = firstId + index;
    const createdAt = toIso(now - spec.days * DAY_MS);
    return [
      {
        id,
        number: invoiceNumber(createdAt, id),
        kind: 'manual' as const,
        status: spec.status,
        amount: toMoney(spec.amount),
        fee: toMoney(0),
        netAmount: toMoney(spec.amount),
        taxAmount: toMoney(0),
        taxRate: toMoney(0),
        taxCountry: merchant.cc,
        customerVatId: '',
        total: toMoney(spec.amount),
        currency: 'USD',
        client: { id: demoNumericId(merchant.id), name: merchant.name },
        customer: null,
        orderId: null,
        pdfFileId: 9500 + id,
        description: spec.what,
        dueAt: toIso(now - spec.days * DAY_MS + 14 * DAY_MS),
        paidAt: spec.status === 'paid' ? toIso(now - (spec.days - 3) * DAY_MS) : null,
        createdAt,
      },
    ];
  });
}

// The tax receipts of the latest delivered storefront orders.
function receipts(firstId: number, orders: DemoOrder[], customers: Map<string, DemoCustomer>): Invoice[] {
  const delivered = orders
    .filter((order) => order.cid && order.status === 'completed' && order.doneAt && order.tax)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    .slice(0, 12);
  return delivered.flatMap((order, index) => {
    const customer = order.cid ? customers.get(order.cid) : undefined;
    if (!customer || !order.doneAt) return [];
    const id = firstId + index;
    const createdAt = toIso(Math.round(order.doneAt));
    return [
      {
        id,
        number: invoiceNumber(createdAt, id),
        kind: 'receipt' as const,
        status: 'paid' as const,
        amount: toMoney(order.price),
        fee: toMoney(0),
        netAmount: toMoney(order.price),
        taxAmount: toMoney(order.tax ?? 0),
        taxRate: toMoney((order.taxRate ?? 0) * 100),
        taxCountry: order.country ?? '',
        customerVatId: '',
        total: toMoney(order.gross ?? order.price),
        currency: 'USD',
        client: null,
        customer: { id: demoNumericId(customer.id), name: customer.name, email: customer.email },
        orderId: demoNumericId(order.id),
        pdfFileId: 9500 + id,
        description: null,
        dueAt: null,
        paidAt: createdAt,
        createdAt,
      },
    ];
  });
}

let store: Promise<Collection<Invoice>> | undefined;

/** The invoices, seeded on first use. Handlers change them in place. */
export function invoiceStore(): Promise<Collection<Invoice>> {
  store ??= loadDemoState().then((state) => {
    const merchants = new Map(demoRows<DemoMerchant>(state, 'merchants').map((m) => [m.id, m]));
    const customers = new Map(demoRows<DemoCustomer>(state, 'customers').map((c) => [c.id, c]));
    const payments = demoRows<DemoPayment>(state, 'payments').map((payment) => topup(payment, merchants));
    const next = payments.reduce((max, invoice) => Math.max(max, invoice.id), 0) + 1;
    const manuals = manual(next, merchants, Date.now());
    const taxReceipts = receipts(next + manuals.length, demoRows<DemoOrder>(state, 'orders'), customers);
    return new Collection([...payments, ...manuals, ...taxReceipts]);
  });
  return store;
}

/** Drops the store so the next use re-seeds it (tests). */
export function resetInvoiceStore(): void {
  store = undefined;
}
