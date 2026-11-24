// Types for the notification templates (`/admin/notification-templates`) and the log of sent notifications (`/admin/notifications`).
// Assumed contracts built from `NotificationTemplateRow` and `NotificationRow`.
import type { JsonValue } from '@/lib/api';
import type { NotificationRow, NotificationTemplateRow } from '@/lib/api/schema.gen';

/** The one way a template is sent: by email. */
export type NotificationChannel = 'email';
export type NotificationAudience = 'customer' | 'merchant' | 'staff';

/**
 * One template as `GET /admin/notification-templates` sends it, with `channel` and `audience` narrowed. Assumed contract: rows
 * may carry `sentLast30Days`, how many notifications used the template in the last 30 days (the demo's "Sent, 30 days").
 */
export type NotificationTemplate = Omit<NotificationTemplateRow, 'channel' | 'audience'> & {
  channel: NotificationChannel;
  audience: NotificationAudience;
  sentLast30Days?: number | null;
};

/** Body of `POST /admin/notification-templates` (assumed contract). */
export type CreateTemplateBody = {
  event: string;
  channel: NotificationChannel;
  audience: NotificationAudience;
  subject: string;
  body: string;
  isActive: boolean;
};

/** Body of `PATCH /admin/notification-templates/:id`: only the fields that change (the "Send" switch sends `{ isActive }`). */
export type UpdateTemplateBody = Partial<CreateTemplateBody>;

/**
 * Body of `POST /admin/notification-templates/:id/preview` (assumed contract): leave both out to preview the saved template,
 * or send the text being edited to preview it before saving.
 */
export type PreviewTemplateBody = { subject?: string; body?: string };

/**
 * The server's rendering of a template with sample data (assumed contract). `format` says whether `body` is plain text or
 * HTML; without it the console decides from the text. The console never runs the HTML: it sits in a sandboxed frame.
 */
export type TemplatePreview = {
  subject: string;
  body: string;
  format?: 'text' | 'html';
  from?: string;
  note?: string;
};

export type NotificationStatus = 'queued' | 'sent' | 'failed';

/**
 * One line of the notification log. Assumed contract: `recipient` is the address or chat as the server prints it, already
 * masked (for example `d***l@example.com`); the console shows it as it comes. `event` is the event key, a text (the map types the column as an id).
 * The detail adds `error` for a failed notification. `campaignId` links a message to the campaign that made it.
 */
export type NotificationLogEntry = Omit<NotificationRow, 'event' | 'status' | 'channel' | 'payload'> & {
  event: string;
  /** `email`, or the word of a channel that was retired, as a message from before it was stored (shown as it is). */
  channel: string;
  status: NotificationStatus;
  recipient: string;
  payload?: JsonValue;
  error?: string | null;
  /** The notification campaign (broadcast) this message belongs to; null for an event's message. The server always sends it. */
  campaignId?: number | null;
};
