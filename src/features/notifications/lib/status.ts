// Words, tones and rules of a campaign's status, purpose and channels: what each status looks like, which actions it allows and when the
// detail page should keep asking the server for news. The server enforces every transition; these only decide what is offered.
import type { BadgeTone, IconName, SelectOption } from '@/components/ui';
import type {
  Campaign,
  CampaignChannel,
  CampaignDetail,
  CampaignPurpose,
  CampaignStatus,
  RecipientStatus,
} from '../types';

/** How a status looks: a word and an icon with a tone (status is never colour alone). */
export type StatusLook = { label: string; tone: BadgeTone; icon: IconName };

export const STATUS_LOOK: Record<CampaignStatus, StatusLook> = {
  draft: { label: 'Draft', tone: 'neutral', icon: 'edit' },
  scheduled: { label: 'Scheduled', tone: 'accent', icon: 'clock' },
  queued: { label: 'Queued', tone: 'warn', icon: 'clock' },
  sending: { label: 'Sending', tone: 'warn', icon: 'send' },
  sent: { label: 'Sent', tone: 'good', icon: 'checkCircle' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'x' },
  failed: { label: 'Failed', tone: 'crit', icon: 'alert' },
};

export const PURPOSE_LABEL: Record<CampaignPurpose, string> = {
  service: 'Service announcement',
  marketing: 'Marketing',
};

export const CHANNEL_LABEL: Record<CampaignChannel, string> = {
  in_app: 'In-app',
  email: 'Email',
};

export const CHANNEL_ICON: Record<CampaignChannel, IconName> = {
  in_app: 'bell',
  email: 'mail',
};

/** The menus above the list. */
export const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All statuses' },
  ...(Object.keys(STATUS_LOOK) as CampaignStatus[]).map((value) => ({
    value,
    label: STATUS_LOOK[value].label,
  })),
];
export const PURPOSE_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All purposes' },
  { value: 'service', label: PURPOSE_LABEL.service },
  { value: 'marketing', label: PURPOSE_LABEL.marketing },
];

/** What the actions of the detail page may do in each status (the server's state machine, section 7 of the plan). */
export const canEdit = (status: CampaignStatus) => status === 'draft' || status === 'scheduled';
export const canSend = canEdit;
export const canSendTest = canEdit;
export const canCancel = (status: CampaignStatus) =>
  status === 'scheduled' || status === 'queued' || status === 'sending';
export const canDelete = (status: CampaignStatus) => status === 'draft';

/** Queued or sending: the worker is still making messages, so the page keeps asking. */
export const isInFlight = (status: CampaignStatus) => status === 'queued' || status === 'sending';

/** True while the detail still shows news worth asking for: the campaign is in flight, or an email message is still queued. */
export function needsRefresh(detail: CampaignDetail | undefined): boolean {
  if (!detail) return false;
  return isInFlight(detail.status) || detail.delivery.email.queued > 0;
}

/** The moment the list's "When" column shows: the time of a scheduled campaign, the end of a sent one, else when it was written. */
export function whenOf(campaign: Campaign): { label: string; at: string } {
  if (campaign.status === 'scheduled' && campaign.scheduledAt)
    return { label: 'Goes out', at: campaign.scheduledAt };
  if (campaign.status === 'sent' && campaign.finishedAt) return { label: 'Sent', at: campaign.finishedAt };
  return { label: 'Created', at: campaign.createdAt };
}

/** The people count of a row: what the fan-out made, or before the send what was expected. */
export function recipientCount(campaign: Campaign): number | null {
  return campaign.status === 'draft' || campaign.status === 'scheduled'
    ? campaign.expectedRecipients
    : campaign.recipients;
}

/** The statuses a recipient row can have on each channel, for the filter next to the recipients table. */
export const RECIPIENT_STATUS_BY_CHANNEL: Record<CampaignChannel, readonly RecipientStatus[]> = {
  in_app: ['delivered', 'read'],
  email: ['queued', 'sent', 'failed'],
};

export const RECIPIENT_STATUS_LOOK: Record<RecipientStatus, StatusLook> = {
  delivered: { label: 'Delivered', tone: 'neutral', icon: 'inbox' },
  read: { label: 'Read', tone: 'good', icon: 'checkCircle' },
  queued: { label: 'Waiting', tone: 'warn', icon: 'clock' },
  sent: { label: 'Sent', tone: 'good', icon: 'checkCircle' },
  failed: { label: 'Failed', tone: 'crit', icon: 'alert' },
};

export const RECIPIENT_TYPE_LABEL = { staff: 'Staff', client: 'Merchant', customer: 'Customer' } as const;
