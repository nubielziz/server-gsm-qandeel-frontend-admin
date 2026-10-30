// Reply template routes (`/admin/reply-templates*`): the canned replies ("macros") the composer inserts. The demo only had
// the list (`S.macros`); the console adds the manage view, so create, edit and delete are new. Every shape is an assumed
// contract (MISMATCHES M10).
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
import type { CreateTemplateBody, ReplyTemplate, UpdateTemplateBody } from '../types';

/**
 * The reply templates, one page of them, with the total in `x-total-count`. The list is short, so the console loads it whole
 * for the composer's picker and the manage view.
 * Assumed contract: `body` holds the raw text with `{{name}}`, `{{order}}` and `{{eta}}` still in it.
 * @route GET /admin/reply-templates
 */
export function listReplyTemplates(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<ReplyTemplate>> {
  return apiList<ReplyTemplate>('/admin/reply-templates', query, undefined, init);
}

/**
 * One template, to refresh the edit form with the latest text.
 * @route GET /admin/reply-templates/:id
 */
export function getReplyTemplate(id: Id, init?: ApiInit): Promise<ReplyTemplate> {
  return apiGet<ReplyTemplate>(pathOf('/admin/reply-templates/:id', { id }), undefined, init);
}

/**
 * Adds a template. The server checks the title and the text and answers 422 with a message per field.
 * Assumed contract: body `{ title, category, locale, body, shortcut }`, answer 201 with the new template.
 * @route POST /admin/reply-templates
 */
export function createReplyTemplate(body: CreateTemplateBody, init?: ApiInit): Promise<ReplyTemplate> {
  return apiPost<ReplyTemplate>('/admin/reply-templates', body, init);
}

/**
 * Edits a template; only the fields that change are sent.
 * Assumed contract: body `{ title?, category?, locale?, body?, shortcut? }`, answer the updated template.
 * @route PATCH /admin/reply-templates/:id
 */
export function updateReplyTemplate(
  id: Id,
  body: UpdateTemplateBody,
  init?: ApiInit,
): Promise<ReplyTemplate> {
  return apiPatch<ReplyTemplate>(pathOf('/admin/reply-templates/:id', { id }), body, init);
}

/**
 * Deletes a template. Replies already sent keep their text; the template just leaves the picker.
 * @route DELETE /admin/reply-templates/:id
 */
export function deleteReplyTemplate(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/reply-templates/:id', { id }), undefined, init);
}
