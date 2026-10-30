// How the screens name refunds, disputes and payments: ids as the demo shows them (`RF-1007`, `DP-2005`, `SF-20467`), the
// badge of each state, the payment methods and the status filters. Ports REFUND_STATUS and DISPUTE_STATUS of 12-state-b2c.js,
// PAY_STATUS and chargeBadge of 13-b2c-ui.js and B2C_METHODS of 09-b2c-data.js.
import type { BadgeTone, IconName } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { DisputeStatus, EvidenceStrength, PaymentMethod, PaymentStatus, RefundStatus } from '../types';

/** The refund's id as the demo shows it: `RF-1007` (the API id is the number, see MISMATCHES M32). */
export const refundLabel = (id: Id): string => `RF-${id}`;

/** The dispute's id as the demo shows it: `DP-2005`. */
export const disputeLabel = (id: Id): string => `DP-${id}`;

/** A storefront order's id as the demo shows it: `SF-20467`. Refunds, disputes and payments are all storefront money. */
export const storefrontOrderLabel = (id: Id): string => `SF-${id}`;

/** A badge: the word, its tone and its icon (status is never colour alone). */
export type BadgeSpec = { label: string; tone: BadgeTone; icon: IconName };

export const REFUND_BADGE: Readonly<Record<RefundStatus, BadgeSpec>> = {
  requested: { label: 'Needs approval', tone: 'warn', icon: 'clock' },
  completed: { label: 'Refunded', tone: 'good', icon: 'checkCircle' },
  failed: { label: 'Failed at gateway', tone: 'crit', icon: 'xCircle' },
  rejected: { label: 'Declined', tone: 'neutral', icon: 'ban' },
};

export const DISPUTE_BADGE: Readonly<Record<DisputeStatus, BadgeSpec>> = {
  needs_response: { label: 'Evidence needed', tone: 'crit', icon: 'alert' },
  under_review: { label: 'With the card network', tone: 'warn', icon: 'clock' },
  won: { label: 'Won', tone: 'good', icon: 'checkCircle' },
  lost: { label: 'Lost', tone: 'crit', icon: 'xCircle' },
};

export const PAYMENT_BADGE: Readonly<Record<PaymentStatus, BadgeSpec>> = {
  captured: { label: 'Paid', tone: 'good', icon: 'checkCircle' },
  refunded: { label: 'Refunded', tone: 'neutral', icon: 'undo' },
  partial_refund: { label: 'Part refunded', tone: 'warn', icon: 'undo' },
  disputed: { label: 'Disputed', tone: 'crit', icon: 'scale' },
  chargeback: { label: 'Chargeback lost', tone: 'crit', icon: 'xCircle' },
};

/** How good the case looks (the demo's `ev.strength`). */
export const STRENGTH_BADGE: Readonly<Record<EvidenceStrength, BadgeSpec>> = {
  strong: { label: 'Strong', tone: 'good', icon: 'checkCircle' },
  fair: { label: 'Fair', tone: 'warn', icon: 'alert' },
  weak: { label: 'Weak', tone: 'crit', icon: 'xCircle' },
};

/**
 * The badge for a state the server named. A state this console does not know shows as a neutral badge with the server's
 * word instead of crashing; an empty payment status reads as paid, as the demo's `chargeBadge` does.
 */
export function badgeFor<S extends string>(
  specs: Readonly<Record<S, BadgeSpec>>,
  status: string,
  fallback?: S,
): BadgeSpec {
  if (Object.hasOwn(specs, status)) return specs[status as S];
  if (fallback) return specs[fallback];
  return { label: status || 'Unknown', tone: 'neutral', icon: 'info' };
}

/** The ways of paying, in the demo's words. */
export const METHOD_LABEL: Readonly<Record<PaymentMethod, string>> = {
  card: 'Card (3DS)',
  wallet: 'Apple / Google Pay',
  crypto: 'Crypto (USDT / BTC)',
};

/** The comparison table lists the methods in this order. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['card', 'wallet', 'crypto'];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value);
}

export function isRefundStatus(value: unknown): value is RefundStatus {
  return Object.hasOwn(REFUND_BADGE, String(value));
}

/** The segmented control above the refunds table. The empty value is "All". */
export const REFUND_FILTERS: readonly { value: RefundStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'requested', label: 'Needs approval' },
  { value: 'failed', label: 'Failed' },
  { value: 'completed', label: 'Refunded' },
  { value: 'rejected', label: 'Declined' },
];

/** The segmented control above the payments table. */
export const METHOD_FILTERS: readonly { value: PaymentMethod | ''; label: string }[] = [
  { value: '', label: 'All methods' },
  { value: 'card', label: 'Card' },
  { value: 'wallet', label: 'Apple / Google Pay' },
  { value: 'crypto', label: 'Crypto' },
];
