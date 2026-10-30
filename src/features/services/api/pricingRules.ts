// Pricing rules (`/admin/pricing-rules*`): margin and discount rules and promos, the "Category rules" table of the demo's
// Rules and groups tab. The demo's `cat-on` and `cat-off` actions (add and remove the Carrier unlock promo) become create and
// delete here. The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
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
import type { CreatePricingRuleBody, PricingRule, UpdatePricingRuleBody } from '../types';

/**
 * The pricing rules. Filters: `scope`, `kind`, `isActive`; sort with `_sort`/`_order` (for example by `priority`).
 * Assumed contract: rows carry the target, service or category, and the merchant group as `{ id, name }` joins, and
 * promos carry `startsAt` and `endsAt`.
 * @route GET /admin/pricing-rules
 */
export function listPricingRules(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<PricingRule>> {
  return apiList<PricingRule>('/admin/pricing-rules', query, undefined, init);
}

/**
 * One pricing rule.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/pricing-rules/:id
 */
export function getPricingRule(id: Id, init?: ApiInit): Promise<PricingRule> {
  return apiGet<PricingRule>(pathOf('/admin/pricing-rules/:id', { id }), undefined, init);
}

/**
 * Creates a rule. It changes the price of new orders only. Amounts the form leaves empty are sent as `0.0000` and
 * dates as null.
 * Assumed contract: body is `CreatePricingRuleBody`, answer the new rule.
 * @route POST /admin/pricing-rules
 */
export function createPricingRule(body: CreatePricingRuleBody, init?: ApiInit): Promise<PricingRule> {
  return apiPost<PricingRule>('/admin/pricing-rules', body, init);
}

/**
 * Changes a rule, or turns it off and on with `isActive`; only the fields that change are sent.
 * Assumed contract: body is any of the fields of `UpdatePricingRuleBody`, answer the updated rule.
 * @route PATCH /admin/pricing-rules/:id
 */
export function updatePricingRule(id: Id, body: UpdatePricingRuleBody, init?: ApiInit): Promise<PricingRule> {
  return apiPatch<PricingRule>(pathOf('/admin/pricing-rules/:id', { id }), body, init);
}

/**
 * Deletes a rule. New orders go back to the prices the other rules give.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/pricing-rules/:id
 */
export function deletePricingRule(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/pricing-rules/:id', { id }), undefined, init);
}
