// Fixtures of the notifications tests: a campaign, its detail and an inbox item, with every field filled and a few overridden. Tests import from here only.
import type { Campaign, CampaignDetail, InboxItem } from '../types';

const BASE: Campaign = {
  id: 7,
  name: 'Winter promo',
  purpose: 'service',
  channels: ['in_app', 'email'],
  status: 'draft',
  scheduledAt: null,
  queuedAt: null,
  startedAt: null,
  finishedAt: null,
  cancelledAt: null,
  expectedRecipients: null,
  recipients: 0,
  planned: { inApp: 0, email: 0, telegram: 0 },
  error: null,
  createdBy: { id: 1, name: 'Rami K.' },
  createdAt: '2026-11-10T09:00:00.000Z',
  updatedAt: '2026-11-10T09:00:00.000Z',
};

/** A campaign list row. */
export function campaign(change: Partial<Campaign> = {}): Campaign {
  return { ...BASE, ...change };
}

/** A campaign with its audience, content and delivery numbers (all zero unless changed). */
export function campaignDetail(change: Partial<CampaignDetail> = {}): CampaignDetail {
  return {
    ...BASE,
    audience: { staff: {}, merchants: {}, customers: { hasAccount: true } },
    content: { en: { title: 'Winter promo', body: 'Hello {{name}},\nBig news.' }, ar: null },
    link: null,
    skipped: { optedOut: 0, noTelegram: 0, noAccount: 0 },
    delivery: {
      inApp: { delivered: 0, read: 0 },
      email: { queued: 0, sent: 0, failed: 0 },
      telegram: { queued: 0, sent: 0, failed: 0 },
    },
    updatedBy: null,
    cancelledBy: null,
    ...change,
  };
}

/** One inbox item. */
export function inboxItem(change: Partial<InboxItem> = {}): InboxItem {
  return {
    id: 1,
    category: 'announcement',
    title: 'Scheduled maintenance',
    body: 'Read-only on Friday.',
    link: null,
    locale: 'en',
    readAt: null,
    createdAt: '2026-11-10T09:00:00.000Z',
    campaignId: null,
    event: null,
    ...change,
  };
}
