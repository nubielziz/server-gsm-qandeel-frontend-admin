// The retail pricing rules and the price changes (`/admin/retail-price-rules*`, `/admin/retail-price-changes*`): the "Retail
// pricing" tab of the Storefront page. These routes are backend additions (feature 31, backend B229 and B230): the map has none,
// so the answers follow the backend plan's wire and the request bodies are the plan's too (MISMATCHES M265). The console sends
// the settings and shows the server's figures; it works out no price, floor, margin or rounding (M92).
import {
  apiDelete,
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
  CreateRetailPriceRuleBody,
  PreviewRetailPriceRuleBody,
  ResolveRetailPriceChangesBody,
  ResolveRetailPriceChangesResult,
  RetailPriceChange,
  RetailPriceRule,
  RetailRulePreview,
  UpdateRetailPriceRuleBody,
} from '../types';

/**
 * The retail pricing rules, with the total in `x-total-count`. Filters: `scope` and `isActive`; sorts `id` and `scope` (the
 * default is the global rule, then the type rules, then the category rules). A deleted rule is not listed.
 * Backend addition, B229.
 * @route GET /admin/retail-price-rules
 */
export function listRetailPriceRules(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<RetailPriceRule>> {
  return apiList<RetailPriceRule>('/admin/retail-price-rules', query, undefined, init);
}

/**
 * Makes a rule. At most one rule exists for a target (every service, one service type, one category): a second one is a 422 on
 * `scope`, a target that does not fit the scope is a 422 on `serviceType` or `categoryId`, and a figure outside its limits a
 * 422 on its field. Following prices move within about two minutes. Answers 201 with the rule. Backend addition, B229.
 * @route POST /admin/retail-price-rules
 */
export function createRetailPriceRule(
  body: CreateRetailPriceRuleBody,
  init?: ApiInit,
): Promise<RetailPriceRule> {
  return apiPost<RetailPriceRule>('/admin/retail-price-rules', body, init);
}

/**
 * Changes a rule: any of its figures, or the switch (`isActive`). Its scope and target never change. Backend addition, B229.
 * @route PATCH /admin/retail-price-rules/:id
 */
export function updateRetailPriceRule(
  id: Id,
  body: UpdateRetailPriceRuleBody,
  init?: ApiInit,
): Promise<RetailPriceRule> {
  return apiPatch<RetailPriceRule>(pathOf('/admin/retail-price-rules/:id', { id }), body, init);
}

/**
 * Deletes a rule (the server keeps the row for the history of price changes). The prices that followed it move to the next
 * rule that covers them, or stay as they are when none is left. Answers 204. Backend addition, B229.
 * @route DELETE /admin/retail-price-rules/:id
 */
export function deleteRetailPriceRule(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/retail-price-rules/:id', { id }), undefined, init);
}

/**
 * What the follow pass would do once a change is saved: how many following prices move up or down, which land on their floor
 * and the biggest changes. Nothing is stored. It refuses the same way the write it previews does (422 with the field).
 * Backend addition, B229.
 * @route POST /admin/retail-price-rules/preview
 */
export function previewRetailPriceRule(
  body: PreviewRetailPriceRuleBody,
  init?: ApiInit,
): Promise<RetailRulePreview> {
  return apiPost<RetailRulePreview>('/admin/retail-price-rules/preview', body, init);
}

/**
 * The price changes: what the server did when a cost moved (followed, stopped following) and the proposals that wait for a
 * person. Filters: `kind`, `waiting` and `serviceId`; sorts `id` and `createdAt`. The count on the tab is this list with
 * `waiting=true`, read from `x-total-count`. Backend addition, B230.
 * @route GET /admin/retail-price-changes
 */
export function listRetailPriceChanges(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<RetailPriceChange>> {
  return apiList<RetailPriceChange>('/admin/retail-price-changes', query, undefined, init);
}

/**
 * Resolves proposals: `apply` sends `seen`, the `newPrice` the list showed for every id, and writes the new price only when
 * that is still the figure of the proposal (else the id is skipped with `changed`, nothing is written and the proposal shows the
 * new figure); `keep` takes no `seen` and makes the current price a typed one. One to 200 ids. The answer lists what was
 * applied and kept, and each id it skipped with the reason. Backend addition, B230.
 * @route POST /admin/retail-price-changes/resolve
 */
export function resolveRetailPriceChanges(
  body: ResolveRetailPriceChangesBody,
  init?: ApiInit,
): Promise<ResolveRetailPriceChangesResult> {
  return apiPost<ResolveRetailPriceChangesResult>('/admin/retail-price-changes/resolve', body, init);
}
