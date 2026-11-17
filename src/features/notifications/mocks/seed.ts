// The three campaigns of the plan's seed (section 11), with the same ids and names as the backend seed: 1 "Scheduled maintenance on Friday" (sent), 2 "Ramadan offer"
// (scheduled for 7 days from now) and 3 "New unlock services" (a draft); and four notifications for the signed-in staff member. Times are relative to the moment the
// store is built, so the screens look the same on any day.
import type { CampaignDetail, CampaignRecipient, InboxItem } from '../types';
import { previewOf } from './audience';
import { deliveryOf, fanOut } from './rows';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

const OWNER = { id: 1, name: 'Rami K.' };

export type SeedCampaign = { campaign: CampaignDetail; rows: CampaignRecipient[] };

/** Campaign 1 is finished; its rows exist. Campaigns 2 and 3 have none. `nextRowId` continues the numbering for later sends. */
export function seedCampaigns(now: number): { items: SeedCampaign[]; nextRowId: number } {
  const maintenance = {
    title: 'Scheduled maintenance on Friday',
    body: 'Hello {{name}},\nThe portal will be read-only on Friday from 02:00 to 03:00 UTC.',
  };
  const base = {
    link: null,
    skipped: { optedOut: 0, noTelegram: 0, noAccount: 0 },
    updatedBy: null,
    cancelledBy: null,
    error: null,
  };
  const empty = {
    inApp: { delivered: 0, read: 0 },
    email: { queued: 0, sent: 0, failed: 0 },
    telegram: { queued: 0, sent: 0, failed: 0 },
  };
  const noPlan = { inApp: 0, email: 0, telegram: 0 };

  // 1: sent two days ago to everyone.
  const sentAt = now - 2 * DAY;
  const audience = { staff: {}, merchants: {}, customers: { hasAccount: true } };
  const channels = ['in_app', 'email'] as const;
  const made = fanOut({ audience, purpose: 'service', channels: [...channels] }, 'done', sentAt, 1);
  const first: CampaignDetail = {
    ...base,
    id: 1,
    name: 'Scheduled maintenance on Friday',
    purpose: 'service',
    channels: [...channels],
    status: 'sent',
    scheduledAt: null,
    queuedAt: iso(sentAt),
    startedAt: iso(sentAt + 5_000),
    finishedAt: iso(sentAt + 60_000),
    cancelledAt: null,
    expectedRecipients: previewOf(audience, channels, 'service').reachable,
    recipients: made.recipients,
    planned: made.planned,
    skipped: made.skipped,
    audience,
    content: maintenance,
    delivery: deliveryOf(made.rows),
    createdBy: OWNER,
    createdAt: iso(sentAt - HOUR),
    updatedAt: iso(sentAt),
  };

  // 2: scheduled for a week from now.
  const customers = { customers: {} };
  const second: CampaignDetail = {
    ...base,
    id: 2,
    name: 'Ramadan offer',
    purpose: 'marketing',
    channels: ['email'],
    status: 'scheduled',
    scheduledAt: iso(now + 7 * DAY),
    queuedAt: null,
    startedAt: null,
    finishedAt: null,
    cancelledAt: null,
    expectedRecipients: previewOf(customers, ['email'], 'marketing').reachable,
    recipients: 0,
    planned: noPlan,
    audience: customers,
    content: {
      title: 'Ramadan offer: 10% off all top-ups',
      body: 'Hello {{name}},\nTop up your wallet this month and get 10% extra.',
    },
    delivery: empty,
    createdBy: OWNER,
    createdAt: iso(now - DAY),
    updatedAt: iso(now - DAY),
  };

  // 3: a draft for merchants.
  const third: CampaignDetail = {
    ...base,
    id: 3,
    name: 'New unlock services',
    purpose: 'service',
    channels: ['in_app'],
    status: 'draft',
    scheduledAt: null,
    queuedAt: null,
    startedAt: null,
    finishedAt: null,
    cancelledAt: null,
    expectedRecipients: null,
    recipients: 0,
    planned: noPlan,
    audience: { merchants: {} },
    content: {
      title: 'New unlock services',
      body: 'Hello {{name}},\nWe added new unlock services to the catalogue. Take a look.',
    },
    delivery: empty,
    createdBy: OWNER,
    createdAt: iso(now - 3 * HOUR),
    updatedAt: iso(now - 3 * HOUR),
  };

  return {
    items: [
      { campaign: first, rows: made.rows },
      { campaign: second, rows: [] },
      { campaign: third, rows: [] },
    ],
    nextRowId: made.rows.length + 1,
  };
}

/** Four notifications for the signed-in staff member, newest first by id: two unread (an order that needs attention and campaign 1's in-app item), two read. */
export function seedInbox(now: number): InboxItem[] {
  const item = (
    id: number,
    change: Partial<InboxItem> & Pick<InboxItem, 'category' | 'title' | 'body'>,
    ago: number,
    read: boolean,
  ): InboxItem => ({
    id,
    link: null,
    campaignId: null,
    event: null,
    readAt: read ? iso(now - ago + 10 * 60_000) : null,
    createdAt: iso(now - ago),
    ...change,
  });
  return [
    item(
      5,
      {
        category: 'order',
        title: 'An order needs attention',
        body: 'Order 1042 timed out at the supplier.\nCheck it before the SLA ends.',
        link: '/orders?order=1042',
        event: 'order.needs_attention',
      },
      5 * HOUR,
      false,
    ),
    item(
      4,
      {
        category: 'support',
        title: 'A ticket is late',
        body: 'Ticket 318 has waited longer than its SLA.',
        link: '/support?filter=late',
        event: 'support.ticket_late',
      },
      DAY,
      true,
    ),
    item(
      3,
      {
        category: 'announcement',
        title: 'Scheduled maintenance on Friday',
        body: 'Hello Rami,\nThe portal will be read-only on Friday from 02:00 to 03:00 UTC.',
        campaignId: 1,
      },
      2 * DAY,
      false,
    ),
    item(
      2,
      {
        category: 'alert',
        title: 'Maintenance mode was turned off',
        body: 'Checkout is open again.',
        link: '/system-health',
        event: 'maintenance.off',
      },
      3 * DAY,
      true,
    ),
  ];
}
