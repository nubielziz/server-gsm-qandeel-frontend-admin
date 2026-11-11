// The notification campaigns API (`/admin/notification-campaigns*`): staff write a message once, pick an audience and channels, see how
// many people it reaches, then send now or schedule. These routes are backend additions (HANDOFF NOTIF-1); the shapes are the backend's contracts.
import {
  apiDelete,
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type {
  AudiencePreview,
  AudiencePreviewBody,
  Campaign,
  CampaignChannel,
  CampaignDetail,
  CampaignInput,
  CampaignPreview,
  CampaignRecipient,
  PreviewCampaignBody,
  ScheduleCampaignBody,
  SendCampaignBody,
  TestCampaignBody,
  TestCampaignResult,
  UpdateCampaignBody,
} from '../types';

const BASE = '/admin/notification-campaigns';

/** What the recipients list needs besides the usual query: the channel is required. */
export type RecipientsQuery = ListQuery & { channel: CampaignChannel };

/**
 * The campaigns staff wrote, newest first. Filters: `status` (repeat it for several), `purpose`, `createdBy`; `q` searches the name; sort by
 * `createdAt`, `scheduledAt` or `id`. The list has no delivery numbers: read one campaign for them. Needs `broadcasts:read`.
 * @route GET /admin/notification-campaigns
 */
export function listCampaigns(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Campaign>> {
  return apiList<Campaign>(BASE, query, undefined, init);
}

/**
 * One campaign with its audience, content, what the fan-out planned and skipped, and live delivery numbers. Needs `broadcasts:read`.
 * @route GET /admin/notification-campaigns/:id
 */
export function getCampaign(id: Id, init?: ApiInit): Promise<CampaignDetail> {
  return apiGet<CampaignDetail>(pathOf(`${BASE}/:id`, { id }), undefined, init);
}

/**
 * Saves a campaign as a draft. Nothing is sent. The server refuses HTML in the text, a Telegram channel with no merchants and an empty audience
 * (422 with the field named). Needs `broadcasts:send`.
 * @route POST /admin/notification-campaigns
 */
export function createCampaign(body: CampaignInput, init?: ApiInit): Promise<CampaignDetail> {
  return apiPost<CampaignDetail>(BASE, body, init);
}

/**
 * Changes any of the fields of a draft or scheduled campaign (at least one). Another status is `409 INVALID_TRANSITION`. Needs `broadcasts:send`.
 * @route PATCH /admin/notification-campaigns/:id
 */
export function updateCampaign(id: Id, body: UpdateCampaignBody, init?: ApiInit): Promise<CampaignDetail> {
  return apiPatch<CampaignDetail>(pathOf(`${BASE}/:id`, { id }), body, init);
}

/**
 * Deletes a draft. A campaign that was scheduled or sent is kept for history (`409 NOT_A_DRAFT`): cancel it instead. Needs `broadcasts:send`.
 * @route DELETE /admin/notification-campaigns/:id
 */
export function deleteCampaign(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf(`${BASE}/:id`, { id }), undefined, init);
}

/**
 * Counts the people an audience reaches with the chosen channels and purpose, and who is left out and why. Counts only, never names; nothing is
 * written. Needs `broadcasts:read`.
 * @route POST /admin/notification-campaigns/audience-preview
 */
export function previewAudience(body: AudiencePreviewBody, init?: ApiInit): Promise<AudiencePreview> {
  return apiPost<AudiencePreview>(`${BASE}/audience-preview`, body, init);
}

/**
 * Renders the campaign for one language and channel with a sample name; `note` says when Arabic falls back to English. Nothing is sent. Needs
 * `broadcasts:read`.
 * @route POST /admin/notification-campaigns/:id/preview
 */
export function previewCampaign(id: Id, body: PreviewCampaignBody, init?: ApiInit): Promise<CampaignPreview> {
  return apiPost<CampaignPreview>(pathOf(`${BASE}/:id/preview`, { id }), body, init);
}

/**
 * Sends the campaign to the signed-in staff member only (an in-app item and an email by default). The campaign itself does not change. Needs
 * `broadcasts:send`.
 * @route POST /admin/notification-campaigns/:id/test
 */
export function sendCampaignTest(
  id: Id,
  body: TestCampaignBody,
  init?: ApiInit,
): Promise<TestCampaignResult> {
  return apiPost<TestCampaignResult>(pathOf(`${BASE}/:id/test`, { id }), body, init);
}

/**
 * Queues a draft or scheduled campaign for sending. `confirmRecipients` is the reachable number the staff member saw: when the audience now differs
 * by more than max(5, 2%) the answer is `409 CONFLICT` with the new number in its detail. Nobody reachable is a 422 on `audience`. The worker does the
 * sending; read the campaign for its progress. Needs `broadcasts:send`.
 * @route POST /admin/notification-campaigns/:id/send
 */
export function sendCampaign(id: Id, body: SendCampaignBody, init?: ApiInit): Promise<CampaignDetail> {
  return apiPost<CampaignDetail>(pathOf(`${BASE}/:id/send`, { id }), body, init);
}

/**
 * Sets the time a draft or scheduled campaign goes out: at least one minute and at most 90 days ahead (422 on `scheduledAt` otherwise). Needs
 * `broadcasts:send`.
 * @route POST /admin/notification-campaigns/:id/schedule
 */
export function scheduleCampaign(
  id: Id,
  body: ScheduleCampaignBody,
  init?: ApiInit,
): Promise<CampaignDetail> {
  return apiPost<CampaignDetail>(pathOf(`${BASE}/:id/schedule`, { id }), body, init);
}

/**
 * Cancels a scheduled, queued or sending campaign: nothing more is made and its in-app items are hidden. A draft is deleted instead; a sent
 * campaign is over (`409 INVALID_TRANSITION`). Needs `broadcasts:send`.
 * @route POST /admin/notification-campaigns/:id/cancel
 */
export function cancelCampaign(id: Id, init?: ApiInit): Promise<CampaignDetail> {
  return apiPost<CampaignDetail>(pathOf(`${BASE}/:id/cancel`, { id }), undefined, init);
}

/**
 * The people of a campaign on one channel (`channel` is required): in-app items are `delivered` or `read`, email and Telegram messages `queued`,
 * `sent` or `failed`. Filter by `status`; the address is masked by the server. Needs `broadcasts:read`.
 * @route GET /admin/notification-campaigns/:id/recipients
 */
export function listCampaignRecipients(
  id: Id,
  { channel, ...query }: RecipientsQuery,
  init?: ApiInit,
): Promise<ListResult<CampaignRecipient>> {
  return apiList<CampaignRecipient>(pathOf(`${BASE}/:id/recipients`, { id }), query, { channel }, init);
}
