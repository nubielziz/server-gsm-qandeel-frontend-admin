// Words and tones for the two logs: the status of a sent notification and of a webhook delivery, the merchant's answer code, and a
// readable form of the JSON the server stores. The logs are tabs the demo lacks; the status values are assumed (HANDOFF).
import type { BadgeTone, IconName, SelectOption } from '@/components/ui';
import type { DeliveryStatus, NotificationStatus, WebhookDelivery } from '../types';

/** How a status looks: a word and an icon with a tone (status is never colour alone). */
export type StatusLook = { label: string; tone: BadgeTone; icon: IconName };

export const NOTIFICATION_STATUS: Record<NotificationStatus, StatusLook> = {
  sent: { label: 'Sent', tone: 'good', icon: 'checkCircle' },
  queued: { label: 'Waiting', tone: 'neutral', icon: 'clock' },
  failed: { label: 'Failed', tone: 'crit', icon: 'alert' },
};

export const DELIVERY_STATUS: Record<DeliveryStatus, StatusLook> = {
  delivered: { label: 'Delivered', tone: 'good', icon: 'checkCircle' },
  pending: { label: 'Waiting', tone: 'warn', icon: 'clock' },
  failed: { label: 'Failed', tone: 'crit', icon: 'alert' },
};

/** The menu above the notification log. */
export const NOTIFICATION_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'queued', label: 'Waiting' },
  { value: 'failed', label: 'Failed' },
];

/** The menu above the webhook log. */
export const DELIVERY_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'pending', label: 'Waiting' },
  { value: 'failed', label: 'Failed' },
];

/** The merchant's answer: the HTTP code, or "No answer" when the call got none (the column is 0). */
export function answerText(code: number): string {
  return code > 0 ? String(code) : 'No answer';
}

/** Whether a delivery can be sent again: one that already worked cannot (the server refuses it too). */
export function canRetry(delivery: Pick<WebhookDelivery, 'status'>): boolean {
  return delivery.status !== 'delivered';
}

/** JSON as indented text for a `<pre>`. A value that cannot be written (it cannot happen for API JSON) gives an empty text. */
export function jsonText(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    return '';
  }
}

/** The host of an address for the table ("hooks.zain.example"), or the text itself when it is not a full address. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
