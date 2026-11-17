// The shop's search tools (`/admin/search*`): synonyms, pinned results, popular terms to hide, the report, the preview and the
// index status with its Rebuild button. These routes are backend additions (feature 29, backend B222): the map has none, so the
// answers follow the backend plan's admin wire and the request bodies are assumed contracts (MISMATCHES M263).
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
  CreateHiddenTermBody,
  CreatePinBody,
  CreateSynonymBody,
  HiddenTerm,
  ReportDays,
  SearchIndexStatus,
  SearchPin,
  SearchPreview,
  SearchPreviewQuery,
  SearchReport,
  SearchSynonym,
  UpdatePinBody,
  UpdateSynonymBody,
} from '../types';

/**
 * The synonym rules, with the total in `x-total-count`. Filters: `q` (a term or the note) and `isEnabled`; sort with
 * `_sort`/`_order` on `updatedAt` or `query`.
 * @route GET /admin/search/synonyms
 */
export function listSearchSynonyms(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<SearchSynonym>> {
  return apiList<SearchSynonym>('/admin/search/synonyms', query, undefined, init);
}

/**
 * Adds a synonym rule. The server normalises the terms (lower case, one space between words) and refuses fewer than the
 * minimum, duplicates, a one-way rule without a root, or a rule that is too long (422, with the field). The shop picks the
 * rule up within a minute.
 * Assumed contract: body `{ kind, root?, terms, isEnabled?, note? }`, answer the new rule.
 * @route POST /admin/search/synonyms
 */
export function createSearchSynonym(body: CreateSynonymBody, init?: ApiInit): Promise<SearchSynonym> {
  return apiPost<SearchSynonym>('/admin/search/synonyms', body, init);
}

/**
 * Changes a rule; only the fields that change are sent (the On switch sends `isEnabled` alone).
 * @route PATCH /admin/search/synonyms/:id
 */
export function updateSearchSynonym(id: Id, body: UpdateSynonymBody, init?: ApiInit): Promise<SearchSynonym> {
  return apiPatch<SearchSynonym>(pathOf('/admin/search/synonyms/:id', { id }), body, init);
}

/**
 * Removes a rule: searches stop expanding to its terms within a minute. Answers 204.
 * @route DELETE /admin/search/synonyms/:id
 */
export function deleteSearchSynonym(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/search/synonyms/:id', { id }), undefined, init);
}

/**
 * The pinned-results rules, with the total in `x-total-count`. Filters: `q` (the query or the note) and `isEnabled`; sort
 * with `_sort`/`_order` on `updatedAt` or `query`. Rows carry the titles of the pinned and hidden services.
 * @route GET /admin/search/pins
 */
export function listSearchPins(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<SearchPin>> {
  return apiList<SearchPin>('/admin/search/pins', query, undefined, init);
}

/**
 * Adds a rule: for searches that match `query`, the pinned services come first at their positions and the hidden ones are
 * left out. The server answers 422 on a service that is not listed, 409 `CONFLICT` for a query and match
 * that already have a rule.
 * Assumed contract: body `{ query, match, pinned: [{ serviceId, position }], hidden: [serviceId], startsAt?, endsAt?,
 * isEnabled?, note? }`, answer the new rule with titles.
 * @route POST /admin/search/pins
 */
export function createSearchPin(body: CreatePinBody, init?: ApiInit): Promise<SearchPin> {
  return apiPost<SearchPin>('/admin/search/pins', body, init);
}

/**
 * Changes a rule; only the fields that change are sent (the On switch sends `isEnabled` alone).
 * @route PATCH /admin/search/pins/:id
 */
export function updateSearchPin(id: Id, body: UpdatePinBody, init?: ApiInit): Promise<SearchPin> {
  return apiPatch<SearchPin>(pathOf('/admin/search/pins/:id', { id }), body, init);
}

/**
 * Removes a rule: the query goes back to its normal order within a minute. Answers 204.
 * @route DELETE /admin/search/pins/:id
 */
export function deleteSearchPin(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/search/pins/:id', { id }), undefined, init);
}

/**
 * The terms kept out of the popular searches (the list under an empty search box).
 * @route GET /admin/search/hidden-terms
 */
export function listHiddenTerms(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<HiddenTerm>> {
  return apiList<HiddenTerm>('/admin/search/hidden-terms', query, undefined, init);
}

/**
 * Keeps a term out of the popular searches. The server answers 409 `CONFLICT` for a term that is already hidden and 422
 * for an empty one.
 * Assumed contract: body `{ term, note? }`, answer the new entry.
 * @route POST /admin/search/hidden-terms
 */
export function createHiddenTerm(body: CreateHiddenTermBody, init?: ApiInit): Promise<HiddenTerm> {
  return apiPost<HiddenTerm>('/admin/search/hidden-terms', body, init);
}

/**
 * Shows a term in the popular searches again. Answers 204.
 * @route DELETE /admin/search/hidden-terms/:id
 */
export function deleteHiddenTerm(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/search/hidden-terms/:id', { id }), undefined, init);
}

/**
 * What visitors searched in the last 7, 30 or 90 days: totals, the 50 most searched terms and the 50 most frequent searches
 * that found nothing. Terms only, with counts per term; never a person, an address or an order.
 * @route GET /admin/search/report
 */
export function getSearchReport(days: ReportDays, init?: ApiInit): Promise<SearchReport> {
  return apiGet<SearchReport>('/admin/search/report', { days }, init);
}

/**
 * The top 10 services for a query as the shop would show them now, with the pinned ones marked and the ids a rule hides. Only
 * saved rules count. `query.q` is the text to rank (1 to 200 characters). The server answers 503 `UNAVAILABLE` while the engine
 * does not answer.
 * @route GET /admin/search/preview
 */
export function getSearchPreview(query: SearchPreviewQuery, init?: ApiInit): Promise<SearchPreview> {
  return apiGet<SearchPreview>('/admin/search/preview', query, init);
}

/**
 * The engine's state and the index: documents against what the database expects, the last run of each job, the queues and
 * the last error.
 * @route GET /admin/search/index
 */
export function getSearchIndex(init?: ApiInit): Promise<SearchIndexStatus> {
  return apiGet<SearchIndexStatus>('/admin/search/index', undefined, init);
}

/**
 * Starts a full rebuild of the index from the database (answers 202; the work runs in the background and the status above
 * says when it is done). Search keeps answering from the current index meanwhile. Answers 409 `JOB_ALREADY_RUNNING` when a
 * rebuild is already running and 503 `UNAVAILABLE` while the engine does not answer.
 * @route POST /admin/search/index/rebuild
 */
export function rebuildSearchIndex(init?: ApiInit): Promise<void> {
  return apiPost<void>('/admin/search/index/rebuild', undefined, init);
}
