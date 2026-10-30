// The risk rules (`GET` and `PUT /admin/risk/rules`): the points that hold or block an order and the switches around them.
// Ports `tabRules`, `rk-rule` and `rk-val` of 54-p-risk.js. The server scores orders with these; the console only edits them.
import { apiGet, apiPut, type ApiInit } from '@/lib/api';
import type { RiskRules, SaveRiskRulesBody } from '../types';

/**
 * The rules and their thresholds: when to hold an order for review and when to block it.
 * Assumed contract: `{ rules: [{ id, on, value }] }` (see `RiskRules`).
 * @route GET /admin/risk/rules
 */
export function getRiskRules(init?: ApiInit): Promise<RiskRules> {
  return apiGet<RiskRules>('/admin/risk/rules', undefined, init);
}

/**
 * Saves the whole set of rules. The server refuses a review threshold that is not below the block threshold (422, with the
 * message on the threshold's field) and writes the change to the audit log.
 * Assumed contract: body `{ rules: [{ id, on, value }] }`; the answer is the saved rules.
 * @route PUT /admin/risk/rules
 */
export function saveRiskRules(body: SaveRiskRulesBody, init?: ApiInit): Promise<RiskRules> {
  return apiPut<RiskRules>('/admin/risk/rules', body, init);
}
