// Text and safety helpers for the Customer emails tab: the event's name, the channel and audience words, which emails are proof that
// should stay on, and how the server's preview is shown. Ports tabNotifs and NOTIF_SAMPLE of 55-p-settings.js.
import type { SelectOption } from '@/components/ui';
import type {
  NotificationAudience,
  NotificationChannel,
  NotificationTemplate,
  TemplatePreview,
} from '../types';

/** "order.completed" is "Order completed": the event key in words, for a row title. */
export function eventLabel(event: string): string {
  const words = event.replace(/[._]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const CHANNEL_LABEL: Record<NotificationChannel, string> = { email: 'Email', telegram: 'Telegram' };
export const AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  customer: 'Customer',
  merchant: 'Merchant',
  staff: 'Staff',
};

export const CHANNEL_OPTIONS: readonly SelectOption[] = [
  { value: 'email', label: 'Email' },
  { value: 'telegram', label: 'Telegram' },
];
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

export const CHANNEL_FILTER_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All channels' },
  ...CHANNEL_OPTIONS,
];

/** The audience the tab opens on. */
export const DEFAULT_AUDIENCE = 'customer';

// The demo asks twice before the receipt, the delivery email and the failure email go off: they are the proof when a customer
// disputes a charge (nt1 to nt3). The event keys are assumed (HANDOFF).
const PROOF_EVENTS = ['order.received', 'order.completed', 'order.failed'];

/** Whether turning this template off should ask first (a customer's receipt or result email). */
export function isProofEmail(
  template: Pick<NotificationTemplate, 'audience' | 'channel' | 'event'>,
): boolean {
  return (
    template.audience === 'customer' && template.channel === 'email' && PROOF_EVENTS.includes(template.event)
  );
}

/** "Customer · Email · en": the line under the title. */
export function templateMeta(
  template: Pick<NotificationTemplate, 'audience' | 'channel' | 'locale'>,
): string {
  return `${AUDIENCE_LABEL[template.audience]} · ${CHANNEL_LABEL[template.channel]} · ${template.locale}`;
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
