// The words an order is completed with. Ports defaultReply of 11-state.js and the reply templates and the `{input}`
// placeholder of completeDialog in 41-p-orders.js, plus REJECT_REASONS of 10-data.js.
import type { Order } from '../types';

/**
 * The reply the drawer starts with, by what was ordered. A service in the "Carrier unlock" category gets the carrier
 * sentence (the demo checked the same category), the rest go by type.
 */
export function defaultReply(order: Pick<Order, 'imei' | 'service'>): string {
  const { service } = order;
  if (service.category === 'Carrier unlock') {
    return 'Unlock confirmed by carrier. Insert a non-supported SIM to verify.';
  }
  switch (service.type) {
    case 'imei':
      return 'Status: Clean. Carrier: unlocked.';
    case 'server':
      return `Delivered to ${order.imei}. Activation takes under 2 minutes.`;
    case 'remote':
      return 'Remote session finished. Device rebooted normally.';
    case 'file':
      return 'File delivered. Check your downloads.';
  }
}

/** One choice of the "Reply template" select. `custom` leaves the text alone. */
export type ReplyTemplate = { value: string; label: string; text: string };

export const REPLY_TEMPLATES: readonly ReplyTemplate[] = [
  { value: 'custom', label: 'Write my own', text: '' },
  {
    value: 'unlock',
    label: 'Unlock confirmed',
    text: 'Unlock confirmed by carrier. Insert a non-supported SIM to verify.',
  },
  { value: 'info', label: 'Info delivered', text: 'Status: Clean. Carrier: unlocked. Region: EU.' },
  {
    value: 'server',
    label: 'Credits delivered',
    text: 'Delivered to {input}. Activation takes under 2 minutes.',
  },
  { value: 'file', label: 'File delivered', text: 'File delivered. Check your downloads.' },
];

/** Puts each order's own input (IMEI, account…) where the reply says `{input}`. */
export function fillInput(reply: string, order: Pick<Order, 'imei'>): string {
  return reply.replace(/\{input\}/g, order.imei);
}

/** The reasons a rejection offers; the buyer sees the one chosen (or the typed one under "Other…"). */
export const REJECT_REASONS: readonly string[] = [
  'IMEI is blacklisted',
  'Carrier not supported for this model',
  'Device already unlocked',
  'Invalid IMEI (failed Luhn check)',
  'Account not found',
  'Requested file not available for this model',
];

/** The id of the drawer's reply box, which the Complete button focuses when the box is empty. */
export function replyFieldId(order: Pick<Order, 'id'>): string {
  return `reply-${order.id}`;
}
