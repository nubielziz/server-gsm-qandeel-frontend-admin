// IP rule routes (`/admin/ip-rules*`, `/admin/access/restriction`). Ports addIpRule, removeIpRule, setAccessRestrict and
// ipVerdict of 14-state-access.js to the API: the demo decided in the browser, the console now asks the server.
// The map gives no bodies, so every body and answer here is an assumed contract (MISMATCHES M10).
import {
  apiDelete,
  apiGet,
  apiList,
  apiPost,
  apiPut,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type {
  CheckIpBody,
  CheckIpResult,
  CreateIpRuleBody,
  IpRule,
  RestrictionBody,
  RestrictionResult,
} from '../types';

/**
 * The allowed and blocked addresses, one page of them, with the total in `x-total-count`. Filter by `kind`
 * (`allow` or `block`) so the long list of automatic blocks never hides the short list of allowed offices.
 * Assumed contract: rows carry the joined `createdBy` and the hit counters; filtered by `kind`.
 * @route GET /admin/ip-rules
 */
export function listIpRules(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<IpRule>> {
  return apiList<IpRule>('/admin/ip-rules', query, undefined, init);
}

/**
 * One IP rule with its hit count, for a detail view or a link from the audit log.
 * Assumed contract: same fields as the list.
 * @route GET /admin/ip-rules/:id
 */
export function getIpRule(id: Id, init?: ApiInit): Promise<IpRule> {
  return apiGet<IpRule>(pathOf('/admin/ip-rules/:id', { id }), undefined, init);
}

/**
 * Allows an address for the admin console, or blocks an address or range for one audience (storefront, merchant API,
 * admin console) or for all of them, optionally until `expiresAt`. A block always beats an allow. Also the way the
 * customers page blocks the last address of a customer.
 * Assumed contract: body `{ kind, scope, cidr, label?, reason?, expiresAt? }`, answer the new rule.
 * @route POST /admin/ip-rules
 */
export function createIpRule(body: CreateIpRuleBody, init?: ApiInit): Promise<IpRule> {
  return apiPost<IpRule>('/admin/ip-rules', body, init);
}

/**
 * Removes an allowed address or lifts a block. Rules that are temporary also remove themselves when they expire.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/ip-rules/:id
 */
export function deleteIpRule(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/ip-rules/:id', { id }), undefined, init);
}

/**
 * Tests an address for one audience before a rule changes: would the visitor be let through, and which rule decided.
 * It is a POST because the address travels in the body, but it changes nothing.
 * Assumed contract: body `{ ip, scope }`, answer `{ decision: 'allowed' | 'refused', rule: IpRule | null }`.
 * @route POST /admin/ip-rules/check
 */
export function checkIp(body: CheckIpBody, init?: ApiInit): Promise<CheckIpResult> {
  return apiPost<CheckIpResult>('/admin/ip-rules/check', body, init);
}

/**
 * Turns the allowed-addresses restriction of the admin console on or off. The server refuses to turn it on when the
 * address of the request is not on the allowed list (that would lock the caller out). The current state is read from
 * the settings (`GET /admin/settings`).
 * Assumed contract: body `{ enabled }`, answer `{ enabled }`.
 * @route PUT /admin/access/restriction
 */
export function setAdminRestriction(body: RestrictionBody, init?: ApiInit): Promise<RestrictionResult> {
  return apiPut<RestrictionResult>('/admin/access/restriction', body, init);
}
