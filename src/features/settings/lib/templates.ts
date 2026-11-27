// Text and safety helpers for the Customer emails tab: the event's name, the channel and audience words, which emails are proof that
// should stay on, and how the server's preview is shown. Ports tabNotifs and NOTIF_SAMPLE of 55-p-settings.js.
import type { SelectOption } from '@/components/ui';
import type { NotificationAudience, NotificationTemplate, TemplatePreview } from '../types';

/** "order.completed" is "Order completed": the event key in words, for a row title. */
export function eventLabel(event: string): string {
  const words = event.replace(/[._]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The events a template can be written for, by the audience that receives the message. A copy of the backend's registry of notification
 * events, which is filled at boot from these files (all under `src/modules` of the backend):
 * - `platform/notifications/notification-events.ts`: `BUILT_IN_EVENTS` (the merchant, customer and staff events of the platform, the
 *   customer's `support.reply` and `customer.security_notice`, the staff alerts and `retail.prices_followed`);
 * - `identity/application/mail/identity-mail-events.ts`: `IDENTITY_MAIL_EVENTS` (the merchant lifecycle and security mails, the two staff
 *   link mails);
 * - `support/application/support-events.ts`: `SUPPORT_EVENTS` (`support.ticket_received` for a customer and for a merchant, and the
 *   merchant's `support.reply`);
 * - `money/application/customer-wallet-notifications.ts`: `CUSTOMER_WALLET_EVENTS` (the five `wallet.*` mails to a customer about the
 *   store balance).
 * Left out on purpose: `platform/notifications/campaigns/broadcast-events.ts` (`BROADCAST_EVENTS`: `broadcast.announcement` and
 * `broadcast.test` have `templated: false`, a campaign writes its own text and the server refuses a template for them).
 * The server refuses a template for any other event (422 on `event`), so the menu cannot offer what it would refuse. Keep it in step
 * with those files when an event is added there.
 */
export const TEMPLATE_EVENTS: Readonly<Record<NotificationAudience, readonly string[]>> = {
  customer: [
    'order.received',
    'order.completed',
    'order.failed',
    'support.reply',
    'support.ticket_received',
    'payment.failed',
    'refund.declined',
    'wallet.topup_credited',
    'wallet.topup_rejected',
    'wallet.adjusted',
    'wallet.frozen',
    'wallet.order_refunded',
    'customer.magic_link',
    'customer.password_reset',
    'customer.invited',
    'customer.email_verification',
    'customer.security_notice',
  ],
  merchant: [
    'merchant.email_verification',
    'merchant.password_reset',
    'merchant.invited',
    'wallet.low_balance',
    'service.price_changed',
    'invoice.paid',
    'order.completed',
    'order.failed',
    'support.reply',
    'support.ticket_received',
    'merchant.suspended',
    'merchant.reactivated',
    'merchant.security_notice',
    'merchant.portal_api_key_created',
  ],
  staff: ['alert.fired', 'alert.resolved', 'retail.prices_followed', 'staff.invited', 'staff.password_reset'],
};

/** The event keys of an audience, in the order of the list above; an audience the console does not know has none. */
export function eventsOf(audience: string): readonly string[] {
  return Object.hasOwn(TEMPLATE_EVENTS, audience) ? TEMPLATE_EVENTS[audience as NotificationAudience] : [];
}

/**
 * The event menu of the template form for an audience: a first line that asks for a choice, then each event in words (`eventLabel`),
 * sorted by those words. The `current` event (a saved template) always stays in the menu, chosen and shown in words, even when the
 * list above does not know it.
 */
export function eventOptions(audience: string, current = ''): SelectOption[] {
  const keys = eventsOf(audience);
  const all = current !== '' && !keys.includes(current) ? [...keys, current] : [...keys];
  return [
    { value: '', label: 'Choose an event…' },
    ...all
      .map((value) => ({ value, label: eventLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

/** "Email". A channel word the console no longer knows (an old line of the log) is shown as it was stored. */
export function channelLabel(channel: string): string {
  return channel === 'email' ? 'Email' : channel;
}

export const AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  customer: 'Customer',
  merchant: 'Merchant',
  staff: 'Staff',
};

export const AUDIENCE_OPTIONS: readonly SelectOption[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'staff', label: 'Staff' },
];

/** What the audience menu above the table offers: the demo only had customer emails, so that is the start. `all` means no filter. */
export const AUDIENCE_FILTER_OPTIONS: readonly SelectOption[] = [
  { value: 'customer', label: 'Customer emails' },
  { value: 'merchant', label: 'Merchant messages' },
  { value: 'staff', label: 'Staff messages' },
  { value: 'all', label: 'All messages' },
];

/** The audience the tab opens on. */
export const DEFAULT_AUDIENCE = 'customer';

// The demo asks twice before the receipt, the delivery email and the failure email go off: they are the proof when a customer
// disputes a charge (nt1 to nt3). The event keys are assumed (HANDOFF).
const PROOF_EVENTS = ['order.received', 'order.completed', 'order.failed'];

/** Whether turning this template off should ask first (a customer's receipt or result email). */
export function isProofEmail(template: Pick<NotificationTemplate, 'audience' | 'event'>): boolean {
  return template.audience === 'customer' && PROOF_EVENTS.includes(template.event);
}

/** "Customer · Email": the line under the title. */
export function templateMeta(template: Pick<NotificationTemplate, 'audience' | 'channel'>): string {
  return `${AUDIENCE_LABEL[template.audience]} · ${channelLabel(template.channel)}`;
}

/** Whether the preview is HTML: the server's `format` when it sends one, else a guess from the markup in the text. */
export function isHtmlPreview(preview: Pick<TemplatePreview, 'format' | 'body'>): boolean {
  if (preview.format) return preview.format === 'html';
  return /<\/?(html|body|p|div|table|a|br|span|h[1-6]|ul|ol|li|strong|em|img)\b/i.test(preview.body);
}

/**
 * The page for the sandboxed frame. The frame has an empty `sandbox` (no scripts, no forms, no same-origin access) and this adds a
 * content policy that blocks everything but inline styles and images, so even a template with a script tag or a tracker runs nothing.
 */
export function previewDocument(body: string): string {
  const policy = "default-src 'none'; img-src data: https:; style-src 'unsafe-inline'";
  const base = 'body{font:14px/1.5 system-ui,sans-serif;color:#1c1b19;margin:12px}img{max-width:100%}';
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><style>${base}</style></head><body>${body}</body></html>`;
}
