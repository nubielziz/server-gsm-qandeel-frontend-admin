// Types of the notification campaigns (`/admin/notification-campaigns*`), written from the backend's contracts (feature 23). The
// routes are backend additions, not in the map, so there is no generated row type (HANDOFF NOTIF-1).
import type { Id, IsoDateTime } from '@/lib/api';

/** Where a campaign is in its life: written, waiting for its time, handed to the worker, being sent, done, stopped or broken. */
export const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'queued',
  'sending',
  'sent',
  'cancelled',
  'failed',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** `service` is an announcement every eligible person gets; `marketing` reaches only customers who agreed to marketing. */
export const CAMPAIGN_PURPOSES = ['service', 'marketing'] as const;
export type CampaignPurpose = (typeof CAMPAIGN_PURPOSES)[number];

/** The ways a campaign can be delivered: in the app, or by email. */
export const CAMPAIGN_CHANNELS = ['in_app', 'email'] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

/** Who a person is: a staff member, a merchant (`client`) or a customer. */
export type PersonType = 'staff' | 'client' | 'customer';
export type PersonRef = { type: PersonType; id: Id };

/** The audience as the server stores it: a key present means that group is targeted (`{}` is all of it). */
export type AudienceSpec = {
  staff?: { roleIds?: Id[] };
  merchants?: { statuses?: ('active' | 'pending')[]; groupIds?: Id[]; countries?: string[] };
  customers?: { hasAccount?: boolean; countries?: string[] };
  include?: PersonRef[];
  exclude?: PersonRef[];
};

/** The text of a campaign: one title and one body (English is the only language of the system, decision 039). */
export type CampaignText = { title: string; body: string };
export type CampaignContent = CampaignText;

/** A site path per audience (`/account/orders`), for the link of the notification. */
export type CampaignLink = { staff?: string; merchant?: string; customer?: string };

export type StaffRef = { id: Id; name: string };

/** Body of `POST /admin/notification-campaigns`. */
export type CampaignInput = {
  name: string;
  purpose: CampaignPurpose;
  channels: CampaignChannel[];
  audience: AudienceSpec;
  content: CampaignContent;
  link?: CampaignLink | null;
};

/** Body of `PATCH /admin/notification-campaigns/:id`: any subset of the input. */
export type UpdateCampaignBody = Partial<CampaignInput>;

/** One row of the campaign list. It has no delivery numbers: read one campaign for them. */
export type Campaign = {
  id: Id;
  name: string;
  purpose: CampaignPurpose;
  channels: CampaignChannel[];
  status: CampaignStatus;
  scheduledAt: IsoDateTime | null;
  queuedAt: IsoDateTime | null;
  startedAt: IsoDateTime | null;
  finishedAt: IsoDateTime | null;
  cancelledAt: IsoDateTime | null;
  /** The reachable count when it was sent or scheduled. */
  expectedRecipients: number | null;
  /** People the fan-out made at least one message for. */
  recipients: number;
  planned: { inApp: number; email: number };
  error: string | null;
  createdBy: StaffRef;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Sent, queued and failed messages of one channel. */
export type ChannelCounters = { queued: number; sent: number; failed: number };

/** One campaign with its audience, content and live delivery numbers. */
export type CampaignDetail = Campaign & {
  audience: AudienceSpec;
  content: CampaignContent;
  link: CampaignLink | null;
  skipped: { optedOut: number; noAccount: number };
  delivery: {
    inApp: { delivered: number; read: number };
    email: ChannelCounters;
  };
  updatedBy: StaffRef | null;
  cancelledBy: StaffRef | null;
};

/** Body of `POST /admin/notification-campaigns/audience-preview`. */
export type AudiencePreviewBody = {
  audience: AudienceSpec;
  channels: CampaignChannel[];
  purpose: CampaignPurpose;
};

/** How many people an audience reaches, and who is left out and why. Counts only, never names. */
export type AudiencePreview = {
  total: number;
  reachable: number;
  byType: { staff: number; client: number; customer: number };
  byChannel: { inApp: number; email: number };
  excluded: { noConsent: number; optedOut: number; noAccount: number };
};

/** Which audience's sample the preview renders with. */
export type PreviewAudience = 'staff' | 'merchant' | 'customer';

/** Body of `POST /admin/notification-campaigns/:id/preview`. */
export type PreviewCampaignBody = {
  channel: CampaignChannel;
  audience?: PreviewAudience;
};

/** The message rendered with sample data (the shape of the template preview). */
export type CampaignPreview = {
  subject: string;
  body: string;
  format: 'text' | 'html';
  from: string;
  note: string;
};

/** Body of `POST /admin/notification-campaigns/:id/test`. */
export type TestCampaignBody = { channels?: ('in_app' | 'email')[] };
export type TestCampaignResult = { queued: ('in_app' | 'email')[] };

/** Body of `POST /admin/notification-campaigns/:id/send`: the reachable number the staff member saw. */
export type SendCampaignBody = { confirmRecipients: number };

/** Body of `POST /admin/notification-campaigns/:id/schedule`. */
export type ScheduleCampaignBody = { scheduledAt: IsoDateTime };

/** What happened to one person's message: in-app items are delivered or read; email messages are queued, sent or failed. */
export const RECIPIENT_STATUSES = ['delivered', 'read', 'queued', 'sent', 'failed'] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

/** One person of a campaign on one channel. `recipient` is masked by the server. */
export type CampaignRecipient = {
  id: Id;
  channel: CampaignChannel;
  recipientType: PersonType;
  recipientId: Id;
  recipient: string;
  status: RecipientStatus;
  error: string | null;
  attempts: number | null;
  sentAt: IsoDateTime | null;
  readAt: IsoDateTime | null;
  createdAt: IsoDateTime;
};
