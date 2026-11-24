// Builds the notification templates from the demo's customer emails (`S.settings.notifs`, with the sample texts of NOTIF_SAMPLE in
// 55-p-settings.js) and a log of sent notifications made up from them. Nothing here is random, so tests see the same rows.
import { toIso } from '@/mocks/seed';
import type { NotificationLogEntry, NotificationStatus, NotificationTemplate } from '../types';

type DemoNotif = { id: string; event: string; audience: string; on: boolean; sent: number; delay: string };

// The event key, subject and text of each demo email, in the demo's order. `{{…}}` marks where the server puts sample data. The demo's
// fifth email (the reminder to finish a checkout) is retired, so it has no text and no template.
const TEXTS: Record<string, { event: string; subject: string; body: string }> = {
  nt1: {
    event: 'order.received',
    subject: 'Your order {{orderId}} is confirmed',
    body: 'Hi {{customerName}}, thanks for your order. We received {{amount}} for "{{service}}". Your receipt is attached and shows the VAT. We will email you the result as soon as the carrier confirms it, usually within a few hours.',
  },
  nt2: {
    event: 'order.completed',
    subject: 'Your unlock is ready',
    body: 'Hi {{customerName}}, good news: the carrier confirmed the unlock for {{orderId}}. Insert a SIM from another network and restart the phone. If anything is unclear, just reply to this email.',
  },
  nt3: {
    event: 'order.failed',
    subject: 'We couldn’t unlock order {{orderId}}',
    body: 'Hi {{customerName}}, the carrier rejected this unlock, so we have refunded {{amount}} to your card. It can take 5 to 10 days to appear. We are sorry it did not work out.',
  },
  nt4: {
    event: 'support.reply',
    subject: 'Re: Where is my result?',
    body: 'Hi {{customerName}}, thanks for your patience. We checked with the carrier and… (the text of the agent’s reply). Reply to this email to keep the conversation going.',
  },
  nt6: {
    event: 'payment.failed',
    subject: 'Your payment didn’t go through',
    body: 'Hi, the payment for your unlock was declined by your bank, so we did not start it. Nothing was charged. You can try again or use another card.',
  },
};

/** The templates: the customer emails of the demo, then two emails for merchants (the demo has none). */
export function templateRows(rows: DemoNotif[]): NotificationTemplate[] {
  const created = toIso(Date.now() - 60 * 86_400_000);
  const customer = rows
    .filter((row) => row.id in TEXTS)
    .map((row): NotificationTemplate => {
      const text = TEXTS[row.id];
      return {
        // The demo's own number (nt6 is 6), so a template keeps its id when another one of the demo is left out.
        id: Number(row.id.replace(/\D/g, '')),
        event: text.event,
        channel: 'email',
        audience: 'customer',
        subject: text.subject,
        body: text.body,
        isActive: row.on,
        sentLast30Days: row.sent,
        createdAt: created,
      };
    });
  const next = Math.max(...customer.map((template) => template.id));
  return [
    ...customer,
    {
      id: next + 1,
      event: 'order.completed',
      channel: 'email',
      audience: 'merchant',
      subject: 'Order {{orderId}} is complete',
      body: 'Order {{orderId}} is complete. The result is in your panel.',
      isActive: true,
      sentLast30Days: 214,
      createdAt: created,
    },
    {
      id: next + 2,
      event: 'wallet.low_balance',
      channel: 'email',
      audience: 'merchant',
      subject: 'Your wallet balance is low',
      body: 'Hi {{customerName}}, your wallet is down to {{amount}}. Add funds to keep your orders running.',
      isActive: true,
      sentLast30Days: 38,
      createdAt: created,
    },
  ];
}

const HOUR_MS = 3_600_000;
const NAMES = ['daniel.whitmore', 'sofia.berg', 'mehmet.aydin', 'lena.fischer', 'omar.haddad', 'ines.costa'];

// A failed notification says why; every seventh is failed and every eleventh still queued.
function statusOf(index: number): NotificationStatus {
  if (index % 7 === 3) return 'failed';
  if (index % 11 === 5) return 'queued';
  return 'sent';
}

/** `d***l@example.com`: the first and last letter of the name, as the server would mask an address. */
function masked(name: string): string {
  return `${name[0]}***${name[name.length - 1]}@example.com`;
}

/** Forty-eight notifications over the last two days and more, newest first, using the events of the templates. */
export function notificationRows(templates: NotificationTemplate[]): NotificationLogEntry[] {
  const now = Date.now();
  return Array.from({ length: 48 }, (_, index) => {
    const template = templates[index % templates.length];
    const status = statusOf(index);
    const at = toIso(now - (index + 1) * HOUR_MS * 1.5);
    return {
      id: 48 - index,
      recipientType: template.audience === 'customer' ? 'customer' : 'client',
      recipientId: 100 + (index % 9),
      channel: template.channel,
      event: template.event,
      payload: { orderId: `SF-${20431 - index}`, templateId: template.id },
      status,
      sentAt: status === 'sent' ? at : null,
      createdAt: at,
      recipient: masked(NAMES[index % NAMES.length]),
      error: status === 'failed' ? 'The mailbox does not exist.' : null,
    };
  });
}
