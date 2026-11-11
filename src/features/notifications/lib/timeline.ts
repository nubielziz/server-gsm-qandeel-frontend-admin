// The campaign's story as timeline events: created, scheduled, queued, started, finished or cancelled, each with the time the server recorded and, where it
// has one, the person who did it. Pure: the page draws them with the shared Timeline.
import type { TimelineEvent } from '@/components/ui';
import type { CampaignDetail } from '../types';

/** Events for the times the campaign has; a time that was never set (a draft has no queue time) gives no event. */
export function timelineOf(campaign: CampaignDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: 'created', at: campaign.createdAt, text: 'Campaign created', by: campaign.createdBy.name },
  ];
  if (campaign.updatedBy && campaign.updatedAt !== campaign.createdAt) {
    events.push({ id: 'edited', at: campaign.updatedAt, text: 'Last edited', by: campaign.updatedBy.name });
  }
  if (campaign.scheduledAt) {
    const past = Date.parse(campaign.scheduledAt) <= Date.now() || campaign.status !== 'scheduled';
    events.push({
      id: 'scheduled',
      at: campaign.scheduledAt,
      kind: 'review',
      text: past ? 'Was set to go out' : 'Goes out',
    });
  }
  if (campaign.queuedAt)
    events.push({ id: 'queued', at: campaign.queuedAt, kind: 'retry', text: 'Queued for sending' });
  if (campaign.startedAt)
    events.push({ id: 'started', at: campaign.startedAt, kind: 'retry', text: 'Sending started' });
  if (campaign.finishedAt) {
    events.push({
      id: 'finished',
      at: campaign.finishedAt,
      kind: campaign.status === 'failed' ? 'rejected' : 'completed',
      text: campaign.status === 'failed' ? 'Sending failed' : 'Sending finished',
    });
  }
  if (campaign.cancelledAt) {
    events.push({
      id: 'cancelled',
      at: campaign.cancelledAt,
      kind: 'rejected',
      text: 'Cancelled',
      by: campaign.cancelledBy?.name,
    });
  }
  return events;
}

/** The share of planned messages that are done (made, sent or failed), 0 to 1; 0 while nothing is planned yet. */
export function progressOf(campaign: CampaignDetail): { done: number; planned: number; ratio: number } {
  const { planned, delivery } = campaign;
  const total = planned.inApp + planned.email + planned.telegram;
  const done =
    delivery.inApp.delivered +
    delivery.email.sent +
    delivery.email.failed +
    delivery.telegram.sent +
    delivery.telegram.failed;
  return { done, planned: total, ratio: total > 0 ? Math.min(1, done / total) : 0 };
}
