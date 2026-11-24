// The shop's search index (`/admin/search/index`): its status and the Rebuild button. These routes are backend additions (feature 29,
// backend B222): the map has none, so the answer follows the backend plan's admin wire (MISMATCHES M263). The synonym, pinned results,
// hidden terms, report and preview routes were retired (decision 025) and are no longer called.
import { apiGet, apiPost, type ApiInit } from '@/lib/api';
import type { SearchIndexStatus } from '../types';

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
