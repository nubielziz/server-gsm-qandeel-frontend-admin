// The notifications mock store: the campaigns and their recipient rows, and the staff member's inbox, built from the seed (decision 014). A campaign that is
// sent moves on by itself as time passes (queued, then sending with some messages still waiting, then sent), so the live screens have something to follow.
import { Collection } from '@/mocks/db';
import type { CampaignDetail, CampaignRecipient, InboxItem } from '../types';
import { fanOut, deliveryOf } from './rows';
import { seedCampaigns, seedInbox } from './seed';

/** How long a sent campaign waits in the queue, and then in "sending", before the mock moves it on. */
export const QUEUE_MS = 2_000;
export const SENDING_MS = 4_000;

export type NotificationsState = {
  campaigns: Collection<CampaignDetail>;
  /** Recipient rows by campaign id, in id order. */
  rows: Map<number, CampaignRecipient[]>;
  inbox: Collection<InboxItem>;
  nextRowId: number;
};

function build(): NotificationsState {
  const now = Date.now();
  const seeded = seedCampaigns(now);
  return {
    campaigns: new Collection(seeded.items.map((item) => item.campaign)),
    rows: new Map(seeded.items.map((item) => [item.campaign.id, item.rows])),
    inbox: new Collection(seedInbox(now)),
    nextRowId: seeded.nextRowId,
  };
}

let state: NotificationsState | undefined;

/** The mock store, built on first use. */
export function notificationsState(): NotificationsState {
  state ??= build();
  return state;
}

/** Puts the store back to the seed (tests, after each test). */
export function resetNotificationsState(): void {
  state = undefined;
}

/**
 * Moves the campaigns that are being sent along, as the worker would: after `QUEUE_MS` the fan-out makes the rows and the campaign is "sending" with some
 * messages waiting; after `SENDING_MS` more it is "sent" and every waiting message is sent. Called by every read.
 */
export function advance(store: NotificationsState, now = Date.now()): void {
  for (const campaign of store.campaigns.list()) {
    if (
      campaign.status === 'queued' &&
      campaign.queuedAt &&
      now - Date.parse(campaign.queuedAt) >= QUEUE_MS
    ) {
      const made = fanOut(campaign, 'sending', now, store.nextRowId);
      store.nextRowId += made.rows.length;
      store.rows.set(campaign.id, made.rows);
      store.campaigns.patch(campaign.id, {
        status: 'sending',
        startedAt: new Date(now).toISOString(),
        recipients: made.recipients,
        planned: made.planned,
        skipped: made.skipped,
        delivery: deliveryOf(made.rows),
      });
    }
    const current = store.campaigns.find(campaign.id);
    if (
      current?.status === 'sending' &&
      current.startedAt &&
      now - Date.parse(current.startedAt) >= SENDING_MS
    ) {
      const rows = (store.rows.get(current.id) ?? []).map((row): CampaignRecipient =>
        row.status === 'queued'
          ? { ...row, status: 'sent', attempts: 1, sentAt: new Date(now).toISOString() }
          : row,
      );
      store.rows.set(current.id, rows);
      store.campaigns.patch(current.id, {
        status: 'sent',
        finishedAt: new Date(now).toISOString(),
        delivery: deliveryOf(rows),
      });
    }
  }
}

/** The campaign as the API sends one detail: the delivery numbers are counted from the rows now. */
export function detailOf(store: NotificationsState, campaign: CampaignDetail): CampaignDetail {
  return { ...campaign, delivery: deliveryOf(store.rows.get(campaign.id) ?? []) };
}

/** The campaign as a list row (the list has no audience, content or delivery numbers). */
export function rowOf(campaign: CampaignDetail) {
  const {
    audience: _audience,
    content: _content,
    link: _link,
    skipped: _skipped,
    delivery: _delivery,
    updatedBy: _updatedBy,
    cancelledBy: _cancelledBy,
    ...row
  } = campaign;
  return row;
}
