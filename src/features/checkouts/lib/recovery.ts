// How a checkout's recovery is shown: the state (ports RECOVERY and recBadge of 51-p-checkouts.js, with the map's consent rule
// added), the words for why the server left a checkout out of a send, and the sentence that sums a send up. The server decides
// who may be emailed; these only turn its answer into text.
import type { BadgeTone, IconName } from '@/components/ui';
import type { AbandonedCheckout, RecoverCheckoutsResult } from '../types';

/**
 * The demo's four states (not reminded, due, sent, recovered) plus `no_consent`, which the demo could not have: a customer who
 * did not agree to marketing email is never reminded (MISMATCHES M1).
 */
export type RecoveryState = 'ready' | 'waiting' | 'sent' | 'recovered' | 'no_consent';

/** Works out the state from what the server sent. A customer who paid after the email counts as recovered. */
export function recoveryState(
  checkout: Pick<AbandonedCheckout, 'recoveryEmailedAt' | 'orderId' | 'marketingConsent' | 'canRecover'>,
): RecoveryState {
  if (checkout.recoveryEmailedAt) return checkout.orderId === null ? 'sent' : 'recovered';
  // Paid without a reminder: nothing is due any more.
  if (checkout.orderId !== null) return 'recovered';
  if (!checkout.marketingConsent) return 'no_consent';
  return checkout.canRecover ? 'ready' : 'waiting';
}

export const RECOVERY_BADGE: Record<RecoveryState, { tone: BadgeTone; icon: IconName; label: string }> = {
  ready: { tone: 'warn', icon: 'mail', label: 'Not reminded' },
  waiting: { tone: 'neutral', icon: 'clock', label: 'Reminder due' },
  sent: { tone: 'neutral', icon: 'send', label: 'Reminder sent' },
  recovered: { tone: 'good', icon: 'checkCircle', label: 'Recovered' },
  no_consent: { tone: 'neutral', icon: 'ban', label: 'Will not be reminded' },
};

/** Said under the badge of a customer who cannot be emailed, so nobody looks for a button that is not there. */
export const NO_CONSENT_NOTE = 'No marketing consent, so no email.';

/** What the server's refusal codes mean, in plain words; each reads after "skipped:". */
const SKIP_TEXT: Record<string, string> = {
  no_marketing_consent: 'the customer has not agreed to marketing email',
  already_emailed: 'a recovery email was already sent',
  already_paid: 'the customer has already paid',
  not_found: 'the checkout no longer exists',
};

/** The words for one refusal code; a code the console does not know is shown as the server wrote it. */
export function skipText(reason: string): string {
  return SKIP_TEXT[reason] ?? reason.replaceAll('_', ' ');
}

/** One group of left-out checkouts that share a reason. */
export type SkipGroup = { reason: string; text: string; ids: number[] };

/** Groups the left-out checkouts by reason, the biggest group first, so the dialog reads "3 have not agreed…, 1 was already emailed". */
export function groupSkipped(skipped: RecoverCheckoutsResult['skipped']): SkipGroup[] {
  const groups = new Map<string, SkipGroup>();
  for (const { id, reason } of skipped) {
    const group = groups.get(reason) ?? { reason, text: skipText(reason), ids: [] };
    group.ids.push(id);
    groups.set(reason, group);
  }
  return [...groups.values()].sort((a, b) => b.ids.length - a.ids.length);
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "3 reminders sent" / "1 reminder sent": the title of the success toast (the demo's). */
export function sentTitle(sent: number): string {
  return `${plural(sent, 'reminder', 'reminders')} sent`;
}

/** The title of the dialog that tells a send was only partly done. */
export function summaryTitle(result: RecoverCheckoutsResult): string {
  const total = result.sent + result.skipped.length;
  return `${result.sent} of ${plural(total, 'checkout', 'checkouts')} emailed`;
}
