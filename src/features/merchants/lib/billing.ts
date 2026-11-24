// The words and looks the Billing tab needs for an invoice: its kind and its status. The finance feature has the same table for its
// own Invoices tab but does not export it, so the three states are named here (display only; the server decides the state).
import type { BadgeTone, IconName } from '@/components/ui';

/** The invoice kinds by name; a kind the console does not know shows as written. */
const KIND_LABEL: Readonly<Record<string, string>> = {
  topup: 'Top-up',
  manual: 'Manual',
  receipt: 'Tax receipt',
};

export function invoiceKind(kind: string): string {
  return Object.hasOwn(KIND_LABEL, kind) ? KIND_LABEL[kind] : kind;
}

type Look = { tone: BadgeTone; icon: IconName; label: string };

const STATUS_LOOK: Readonly<Record<string, Look>> = {
  open: { tone: 'warn', icon: 'clock', label: 'Open' },
  paid: { tone: 'good', icon: 'checkCircle', label: 'Paid' },
  void: { tone: 'neutral', icon: 'ban', label: 'Void' },
};

/** The badge of an invoice status; one the console does not know shows its own word in grey. */
export function invoiceStatusLook(status: string): Look {
  return Object.hasOwn(STATUS_LOOK, status)
    ? STATUS_LOOK[status]
    : { tone: 'neutral', icon: 'info', label: status };
}

/** Rows a page of the Billing tab shows, for each of its two tables. */
export const BILLING_PAGE_SIZE = 10;

/** Entries a first page of the Audit tab shows, and how many "Show more" adds. */
export const AUDIT_TAB_PAGE_SIZE = 25;
