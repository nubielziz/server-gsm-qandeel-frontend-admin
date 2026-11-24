// Words and tones for the notification log: the status of a sent notification, and a readable form of the JSON the server stores.
// The log is a tab the demo lacks; the status values are assumed (HANDOFF).
import type { BadgeTone, IconName, SelectOption } from '@/components/ui';
import type { NotificationStatus } from '../types';

/** How a status looks: a word and an icon with a tone (status is never colour alone). */
export type StatusLook = { label: string; tone: BadgeTone; icon: IconName };

export const NOTIFICATION_STATUS: Record<NotificationStatus, StatusLook> = {
  sent: { label: 'Sent', tone: 'good', icon: 'checkCircle' },
  queued: { label: 'Waiting', tone: 'neutral', icon: 'clock' },
  failed: { label: 'Failed', tone: 'crit', icon: 'alert' },
};

/** The menu above the notification log. */
export const NOTIFICATION_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'queued', label: 'Waiting' },
  { value: 'failed', label: 'Failed' },
];

/**
 * The recipient type of a log line in words. A new line says `account` (a merchant and a retail account alike); the lines written before
 * the accounts were merged keep their word (`client` is a merchant, `customer` a store customer), because the log is never rewritten.
 */
export function recipientTypeText(recipientType: string): string {
  switch (recipientType) {
    case 'account':
      return 'Account';
    case 'client':
      return 'Merchant';
    case 'customer':
      return 'Customer';
    case 'staff':
      return 'Staff';
    default:
      return recipientType;
  }
}

/** JSON as indented text for a `<pre>`. A value that cannot be written (it cannot happen for API JSON) gives an empty text. */
export function jsonText(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    return '';
  }
}
