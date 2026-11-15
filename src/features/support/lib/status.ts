// How the screen names a ticket: status badges, categories, channels and priorities. Ports TICKET_STATUS, TICKET_CATS and
// CHANNEL_LABEL of 12-state-b2c.js / 49-p-support.js. These are words only; the server owns every state change.
import type { BadgeTone, IconName, SelectOption } from '@/components/ui';
import { maskedCustomerLabel } from '@/lib/format';
import type {
  ReplyChannel,
  SupportTicket,
  TicketCategory,
  TicketChannel,
  TicketPriority,
  TicketStatus,
} from '../types';

/** The badge of each status: word, tone and icon (status is never colour alone). */
export const STATUS_BADGE: Readonly<
  Record<TicketStatus, { label: string; tone: BadgeTone; icon: IconName }>
> = {
  new: { label: 'New', tone: 'serious', icon: 'inbox' },
  open: { label: 'Open', tone: 'neutral', icon: 'clock' },
  pending: { label: 'Waiting on customer', tone: 'warn', icon: 'clock' },
  resolved: { label: 'Resolved', tone: 'good', icon: 'checkCircle' },
};

/** What a ticket is about, in words (the demo's `TICKET_CATS`). */
export const CATEGORY_LABEL: Readonly<Record<TicketCategory, string>> = {
  delay: 'Delay',
  failed_unlock: 'Unlock failed',
  refund: 'Refund',
  billing: 'Billing',
  wrong_imei: 'Wrong IMEI',
  howto: 'How-to',
  presale: 'Before buying',
  other: 'Other',
};

/** The categories as select options, in the demo's order. */
export const CATEGORY_OPTIONS: readonly SelectOption[] = (
  Object.entries(CATEGORY_LABEL) as [TicketCategory, string][]
).map(([value, label]) => ({ value, label }));

/** How the ticket reached us (the demo's `CHANNEL_LABEL`). */
export const CHANNEL_LABEL: Readonly<Record<TicketChannel, string>> = {
  email: 'Email',
  web: 'Contact form',
  chat: 'Live chat',
  telegram: 'Telegram',
};

/** The ways a reply can go out. */
export const REPLY_CHANNEL_LABEL: Readonly<Record<ReplyChannel, string>> = {
  email: 'Email',
  telegram: 'Telegram',
};

/** The priority select, with the demo's wording. */
export const PRIORITY_OPTIONS: readonly { value: TicketPriority; label: string }[] = [
  { value: 'high', label: 'High priority' },
  { value: 'normal', label: 'Normal priority' },
  { value: 'low', label: 'Low priority' },
];

/** The languages a reply template can be written in. */
export const LOCALE_OPTIONS: readonly SelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
];

/** The first word of a name, for "Write a reply to Jessica" and the `{{name}}` variable. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/**
 * Who wrote the ticket, as the inbox shows them. A merchant is its company name; a customer can have an empty name, so
 * the label falls back to the masked email (the inbox masks customer emails) and then to `Customer #id`.
 */
export function requesterLabel(
  ticket: Pick<SupportTicket, 'requesterType' | 'requesterId' | 'requester'>,
): string {
  const { requester } = ticket;
  if (ticket.requesterType === 'client') return requester.name;
  return maskedCustomerLabel({ id: ticket.requesterId, name: requester.name, email: requester.email });
}
