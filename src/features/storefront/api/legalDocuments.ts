// The legal documents (`/admin/legal-documents*`): the legal half of the Content and legal tab. Ports `tabContent` and
// `publishLegal` (50-p-storefront.js, 12-state-b2c.js). A version is written first and published after, because the map
// has no edit route: a published text never changes. The map gives no bodies (MISMATCHES M10), so shapes are assumed.
import {
  apiGet,
  apiList,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { CreateLegalBody, LegalDocument } from '../types';

/**
 * Every version of the terms, privacy, refund and cookie documents. Filters: `type`, `locale` and `isCurrent`.
 * Assumed contract: rows carry `isCurrent`, `effectiveFrom` (`null` until published), `requiresReacceptance` and
 * `acceptedCount` (how often customers accepted the version at checkout).
 * @route GET /admin/legal-documents
 */
export function listLegalDocuments(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<LegalDocument>> {
  return apiList<LegalDocument>('/admin/legal-documents', query, undefined, init);
}

/**
 * One version with its Markdown text.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/legal-documents/:id
 */
export function getLegalDocument(id: Id, init?: ApiInit): Promise<LegalDocument> {
  return apiGet<LegalDocument>(pathOf('/admin/legal-documents/:id', { id }), undefined, init);
}

/**
 * Writes a new version. It is not in force until it is published.
 * Assumed contract: body `{ type, locale, version, bodyMd, requiresReacceptance }`, answer the new version.
 * @route POST /admin/legal-documents
 */
export function createLegalDocument(body: CreateLegalBody, init?: ApiInit): Promise<LegalDocument> {
  return apiPost<LegalDocument>('/admin/legal-documents', body, init);
}

/**
 * Approves a version: it becomes the one in force and appears in later consents. Orders already placed keep the version
 * they accepted.
 * Assumed contract: no body, answer the published version.
 * @route POST /admin/legal-documents/:id/publish
 */
export function publishLegalDocument(id: Id, init?: ApiInit): Promise<LegalDocument> {
  return apiPost<LegalDocument>(pathOf('/admin/legal-documents/:id/publish', { id }), undefined, init);
}
