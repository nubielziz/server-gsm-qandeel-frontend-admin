// The words and looks the Invoices part needs for an invoice: its kind, and its status as a square with a word. The finance feature
// has the same table for its own Invoices tab but does not export it, so the three states are named here (display only: the server decides).
import type { SquareTone } from '@/components/ui';

/** The invoice kinds by name; a kind the console does not know shows as written. */
const KIND_LABEL: Readonly<Record<string, string>> = {
  topup: 'Top-up',
  manual: 'Manual',
  receipt: 'Tax receipt',
};

/**
 * The words of an invoice kind.
 *
 * @param kind the kind the server sent.
 * @returns "Top-up", "Manual" or "Tax receipt"; any other kind as written.
 */
export function invoiceKind(kind: string): string {
  return Object.hasOwn(KIND_LABEL, kind) ? KIND_LABEL[kind] : kind;
}

/** A status as a square and a word. */
export type InvoiceLook = { tone: SquareTone; label: string };

const STATUS_LOOK: Readonly<Record<string, InvoiceLook>> = {
  open: { tone: 'warn', label: 'Open' },
  paid: { tone: 'ok', label: 'Paid' },
  void: { tone: 'off', label: 'Void' },
};

/**
 * The square and the word of an invoice status: Open is amber, Paid green, Void hollow. A status the console does not know shows the
 * server's own word with a hollow square.
 *
 * @param status the status the server sent.
 */
export function invoiceStatusLook(status: string): InvoiceLook {
  if (Object.hasOwn(STATUS_LOOK, status)) return STATUS_LOOK[status];
  return { tone: 'off', label: status.trim() || 'Unknown' };
}
