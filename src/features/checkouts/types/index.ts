// Types for the checkouts feature (`/checkouts`, `/admin/checkouts/*`, `/admin/reports/funnel`): an abandoned checkout with its consent,
// the recovery request and its answer, and the sales funnel. The map names the routes but gives no bodies (MISMATCHES M10), so every
// shape below is an assumed contract, built from the generated `checkout_sessions` row in `src/lib/api/schema.gen.ts`.
import type { Id } from '@/lib/api';
import type { CheckoutSessionRow } from '@/lib/api/schema.gen';

/**
 * One abandoned checkout as `GET /admin/checkouts/abandoned` sends a row (assumed contract): the `checkout_sessions` columns the
 * screen shows, two joins (`serviceName`, `currencyCode`; the table only has ids) and the three facts the recovery rule needs.
 * `email` arrives masked. `marketingConsent` comes from `consent_records` (the latest marketing record is a grant). `canRecover`
 * is the server's own answer to "may a recovery email go out now": consent given, none sent yet, not paid. `orderId` is set
 * when the customer paid in the end. The console never works these out itself; it shows them.
 */
export type AbandonedCheckout = Pick<
  CheckoutSessionRow,
  'id' | 'email' | 'grossAmount' | 'fxRate' | 'status' | 'utm' | 'recoveryEmailedAt' | 'createdAt'
> & {
  serviceName: string;
  currencyCode: string;
  orderId: Id | null;
  marketingConsent: boolean;
  canRecover: boolean;
};

/** Body of `POST /admin/checkouts/recover` (assumed contract): the checkouts to email. The server decides for each one. */
export type RecoverCheckoutsBody = { ids: Id[] };

/**
 * Why the server did not email a checkout (assumed contract). The known codes have a plain-words text in `lib/recovery.ts`;
 * any other code the server sends is shown as it is.
 */
export type SkipReason = 'no_marketing_consent' | 'already_emailed' | 'already_paid' | 'not_found';

/** One checkout the server left out of the send, with the reason code (a `SkipReason`, or another code the server adds). */
export type SkippedCheckout = { id: Id; reason: string };

/** The answer of the recover call (assumed contract): how many emails went out and which checkouts were left out. */
export type RecoverCheckoutsResult = { sent: number; skipped: SkippedCheckout[] };

/** Periods the funnel can look back, in days. */
export const FUNNEL_PERIODS = [7, 30, 90] as const;
export type FunnelDays = (typeof FUNNEL_PERIODS)[number];

/** Query of `GET /admin/reports/funnel` (assumed contract): the look-back period in days. */
export type FunnelQuery = { days?: number };

/**
 * `GET /admin/reports/funnel` (assumed contract): how many people reached each step in the last `days` days. The four counts are
 * the map's steps: an IMEI check, a payment started, paid, delivered. The server counts; the console only formats.
 */
export type FunnelReport = {
  days: number;
  imeiChecks: number;
  paymentStarted: number;
  paid: number;
  delivered: number;
};
