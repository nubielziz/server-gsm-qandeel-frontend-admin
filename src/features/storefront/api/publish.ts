// The publish runs (`/admin/publish-runs*`): the "Publish" tab of the Storefront page. These routes are backend additions (feature 31,
// backend B228): the map has none, so the answers follow the backend plan's wire and the request bodies are the plan's too
// (MISMATCHES M265). A run is a draft the server keeps (the preview), then a background job; the console sends the choices and
// shows what the server answers. It works out no title, slug, price, floor or margin (M92).
import {
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
  ApplyPublishRunBody,
  BulkPublishItemsBody,
  BulkPublishItemsResult,
  CancelPublishRunBody,
  CreatePublishRunBody,
  PublishItem,
  PublishRun,
  SetPublishRunListedBody,
  UpdatePublishItemBody,
} from '../types';

/**
 * Starts a run: the server counts the services of the scope that have no listing and prepares the preview in the background.
 * Answers 202 with the run (`preparing`). The scope `run` makes a new draft from an earlier run ("Check again" from a draft,
 * "Review the rest" from a finished one). Refusals: 422 on `scope` (`nothing_to_publish`, `too_many`, or `invalid` for an unknown
 * category, supplier or run) and 409 when the earlier run is still working. Backend addition, B228.
 * @route POST /admin/publish-runs
 */
export function createPublishRun(body: CreatePublishRunBody, init?: ApiInit): Promise<PublishRun> {
  return apiPost<PublishRun>('/admin/publish-runs', body, init);
}

/**
 * The runs, with the total in `x-total-count`. Filters: `status`, `source` and `quickAddRunId`; sorts `id` and `createdAt`. A run
 * that has not moved for 5 minutes reads `failed`. Backend addition, B228.
 * @route GET /admin/publish-runs
 */
export function listPublishRuns(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<PublishRun>> {
  return apiList<PublishRun>('/admin/publish-runs', query, undefined, init);
}

/**
 * One run, with its counts and its switch. The page reads it again every 1.5 s while it is working. Backend addition, B228.
 * @route GET /admin/publish-runs/:id
 */
export function getPublishRun(id: Id, init?: ApiInit): Promise<PublishRun> {
  return apiGet<PublishRun>(pathOf('/admin/publish-runs/:id', { id }), undefined, init);
}

/**
 * The rows of a run, with the total in `x-total-count`. Filters: `state`, `included`, `result` (`pending` selects the rows with no
 * result), `flag`, `brandKind` and `afterId` (the rows after one: the "Save and next" of the preview); `q` searches the title, the
 * slug and the service's name and code; sorts `id` (the default), `title` and `cost`. Backend addition, B228.
 * @route GET /admin/publish-runs/:id/items
 */
export function listPublishItems(
  id: Id,
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<PublishItem>> {
  return apiList<PublishItem>(pathOf('/admin/publish-runs/:id/items', { id }), query, undefined, init);
}

/**
 * Changes one row of a draft and answers it worked out again. Only the keys that change are sent; a price key (`retailPrice`,
 * `pricing`) also needs `storefront:update`. Refusals: 409 when the run is no longer a draft, 422 with the field (`retailPrice`
 * under the floor, `slug` taken, `included` on a blocked row, `pricing` without a price to keep). Backend addition, B228.
 * @route PATCH /admin/publish-runs/:id/items/:itemId
 */
export function updatePublishItem(
  id: Id,
  itemId: Id,
  body: UpdatePublishItemBody,
  init?: ApiInit,
): Promise<PublishItem> {
  return apiPatch<PublishItem>(pathOf('/admin/publish-runs/:id/items/:itemId', { id, itemId }), body, init);
}

/**
 * Changes many rows of a draft at once: the rows are named by id (1 to 500) or by a filter (every row that matches), and `set`
 * says what to put on them. Answers how many changed and how many could not be included (blocked rows). Backend addition, B228.
 * @route POST /admin/publish-runs/:id/items/bulk
 */
export function bulkUpdatePublishItems(
  id: Id,
  body: BulkPublishItemsBody,
  init?: ApiInit,
): Promise<BulkPublishItemsResult> {
  return apiPost<BulkPublishItemsResult>(pathOf('/admin/publish-runs/:id/items/bulk', { id }), body, init);
}

/**
 * Publishes the draft's included rows in the background (202, the run is `queued`), or continues a failed run. `listed: false`
 * creates the listings switched off. Refusals: 409 `JOB_ALREADY_RUNNING` (already published or being switched), 409 for a run
 * that is still preparing or finished, 422 on `included` when no row is included. Needs `storefront:publish`. Backend addition, B228.
 * @route POST /admin/publish-runs/:id/apply
 */
export function applyPublishRun(id: Id, body: ApplyPublishRunBody, init?: ApiInit): Promise<PublishRun> {
  return apiPost<PublishRun>(pathOf('/admin/publish-runs/:id/apply', { id }), body, init);
}

/**
 * Discards a draft, or stops a run that is preparing, queued or running (rows already published stay published). Answers the run
 * (`cancelled`). Stopping a live run also needs `storefront:publish`. Backend addition, B228.
 * @route POST /admin/publish-runs/:id/cancel
 */
export function cancelPublishRun(
  id: Id,
  body: CancelPublishRunBody = {},
  init?: ApiInit,
): Promise<PublishRun> {
  return apiPost<PublishRun>(pathOf('/admin/publish-runs/:id/cancel', { id }), body, init);
}

/**
 * The run switch: takes every listing the run published off the shop (`listed: false`), or puts them back (`true`). Nothing is
 * deleted and no price changes. Answers 202 with the run (`switch.status` is `queued`). Refusals: 409 for a run that is not
 * finished or published nothing, and 409 `JOB_ALREADY_RUNNING` while a switch is going. Needs `storefront:publish`. Backend addition, B228.
 * @route POST /admin/publish-runs/:id/listed
 */
export function setPublishRunListed(
  id: Id,
  body: SetPublishRunListedBody,
  init?: ApiInit,
): Promise<PublishRun> {
  return apiPost<PublishRun>(pathOf('/admin/publish-runs/:id/listed', { id }), body, init);
}
