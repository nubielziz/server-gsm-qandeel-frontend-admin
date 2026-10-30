// What the Invoices tab says about an invoice: kind names, status badges, who it is billed to, and the amount typed in the
// issue dialog. New in the console (MISMATCHES M123), so there is no demo function to port.
import type { StatusBadge } from './payments';
import { maskEmail } from '@/lib/format';
import { plainWords } from './kinds';
import type { Invoice, InvoiceStatus } from '../types';

/** The kinds of invoice by name. `receipt` is the tax receipt a storefront customer gets. */
export const INVOICE_KIND_LABEL: Readonly<Record<string, string>> = {
  topup: 'Top-up',
  manual: 'Manual',
  receipt: 'Tax receipt',
  statement: 'Statement',
};

export function invoiceKindLabel(kind: string): string {
  return Object.hasOwn(INVOICE_KIND_LABEL, kind) ? INVOICE_KIND_LABEL[kind] : plainWords(kind, 'Invoice');
}

/** The badge of each status: waiting for payment, paid, cancelled. */
export const INVOICE_STATUS_BADGE: Readonly<Record<InvoiceStatus, StatusBadge>> = {
  open: { tone: 'warn', icon: 'clock', label: 'Open' },
  paid: { tone: 'good', icon: 'checkCircle', label: 'Paid' },
  void: { tone: 'neutral', icon: 'ban', label: 'Void' },
};

/** The badge for a status the server sends; one the console does not know shows its own word in grey. */
export function invoiceStatusBadge(status: string): StatusBadge {
  return Object.hasOwn(INVOICE_STATUS_BADGE, status)
    ? INVOICE_STATUS_BADGE[status as InvoiceStatus]
    : { tone: 'neutral', icon: 'info', label: plainWords(status, 'Unknown') };
}

/** Who the invoice is billed to: a merchant (linked to its page) or a storefront customer (email masked, as in Orders). */
export function billedTo(invoice: Pick<Invoice, 'client' | 'customer'>): { name: string; href?: string } {
  if (invoice.client) return { name: invoice.client.name, href: `/merchants/${invoice.client.id}` };
  if (invoice.customer) return { name: maskEmail(invoice.customer.email) };
  return { name: '–' };
}

const AMOUNT = /^(\d{1,12})(?:\.(\d{1,4}))?$/;

/**
 * The amount typed in the issue dialog as the 4-decimal money string the API takes ("125.5" is "125.5000"), or null
 * when it is not an amount. A leading "$" and thousands commas are allowed. Done on the text, with no float maths.
 */
export function normalizeAmount(text: string): string | null {
  const match = AMOUNT.exec(text.trim().replace(/^\$/, '').replace(/,/g, ''));
  if (!match) return null;
  return `${match[1].replace(/^0+(?=\d)/, '')}.${(match[2] ?? '').padEnd(4, '0')}`;
}

/** Whether a money string is more than zero, read from its digits (a UX hint; the server checks the amount). */
export function isPositiveMoney(amount: string): boolean {
  return /[1-9]/.test(amount);
}
