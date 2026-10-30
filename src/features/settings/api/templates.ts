// Notification templates (`/admin/notification-templates*`): the Customer emails tab. The map gives no bodies (MISMATCHES M10), so
// shapes are assumed contracts. Reading and previewing need `notifications:read`; the changes `notifications:create|update|delete`.
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
  CreateTemplateBody,
  NotificationTemplate,
  PreviewTemplateBody,
  TemplatePreview,
  UpdateTemplateBody,
} from '../types';

/**
 * The templates for each event and channel. Filters: `audience` (`customer`, `merchant`, `staff`), `channel`, `isActive`.
 * @route GET /admin/notification-templates
 */
export function listTemplates(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<NotificationTemplate>> {
  return apiList<NotificationTemplate>('/admin/notification-templates', query, undefined, init);
}

/**
 * One template.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/notification-templates/:id
 */
export function getTemplate(id: Id, init?: ApiInit): Promise<NotificationTemplate> {
  return apiGet<NotificationTemplate>(pathOf('/admin/notification-templates/:id', { id }), undefined, init);
}

/**
 * Adds a template for an event, channel and language. Assumed contract: body `CreateTemplateBody`, answer the new template.
 * @route POST /admin/notification-templates
 */
export function createTemplate(body: CreateTemplateBody, init?: ApiInit): Promise<NotificationTemplate> {
  return apiPost<NotificationTemplate>('/admin/notification-templates', body, init);
}

/**
 * Changes a template; only the fields that change are sent. The "Send" switch sends `{ isActive }`.
 * Assumed contract: answer the updated template.
 * @route PATCH /admin/notification-templates/:id
 */
export function updateTemplate(
  id: Id,
  body: UpdateTemplateBody,
  init?: ApiInit,
): Promise<NotificationTemplate> {
  return apiPatch<NotificationTemplate>(pathOf('/admin/notification-templates/:id', { id }), body, init);
}

/**
 * Removes a template. Assumed contract: no body, answer 204.
 * @route DELETE /admin/notification-templates/:id
 */
export function deleteTemplate(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/notification-templates/:id', { id }), undefined, init);
}

/**
 * Renders a template with the server's sample data, so staff see what a customer would get. The console shows the answer as
 * text, or HTML in a sandboxed frame; it never runs it.
 * Assumed contract: body `PreviewTemplateBody` (empty for the saved text), answer `TemplatePreview`.
 * @route POST /admin/notification-templates/:id/preview
 */
export function previewTemplate(
  id: Id,
  body: PreviewTemplateBody = {},
  init?: ApiInit,
): Promise<TemplatePreview> {
  return apiPost<TemplatePreview>(pathOf('/admin/notification-templates/:id/preview', { id }), body, init);
}
