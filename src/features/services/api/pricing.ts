// The pricing actions that are not plain CRUD: the bulk price change (preview, then apply) and the price resolver.
// Ports the "Price resolver" tab of 43-p-services.js (`resolveWith` of 10-data.js ran in the browser; the server resolves here)
// and adds the bulk change the map defines. The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
import { apiGet, apiPost, type ApiInit } from '@/lib/api';
import type {
  BulkPriceBody,
  BulkPricePreview,
  BulkPriceResult,
  PriceResolution,
  ResolveQuery,
} from '../types';

/**
 * Shows what a bulk price change would do, service by service, without saving anything: the old price, the new price and
 * whether the new price falls under the floor. The same body goes to the apply call.
 * Assumed contract: body `{ categoryId | serviceIds, change: { type, value } }`, answer `{ lines, belowFloor }`.
 * @route POST /admin/services/bulk-price/preview
 */
export function previewBulkPrice(body: BulkPriceBody, init?: ApiInit): Promise<BulkPricePreview> {
  return apiPost<BulkPricePreview>('/admin/services/bulk-price/preview', body, init);
}

/**
 * Applies a bulk price change with the body that was previewed. The server writes an audit entry and decides what to do
 * with a price that would fall under its floor.
 * Assumed contract: same body as the preview, answer `{ updated, belowFloor }`.
 * @route POST /admin/services/bulk-price/apply
 */
export function applyBulkPrice(body: BulkPriceBody, init?: ApiInit): Promise<BulkPriceResult> {
  return apiPost<BulkPriceResult>('/admin/services/bulk-price/apply', body, init);
}

/**
 * The price of one service for one merchant, with the steps that led to it: the client override, the group price, the base
 * price, the category rule, the group discount, then the floor check. Nothing is worked out in the browser.
 * Assumed contract: query `serviceId` and `clientId`; answer `PriceResolution` (steps, floor, final price, margin and
 * optionally the price for the other groups).
 * @route GET /admin/pricing/resolve
 */
export function resolvePrice(query: ResolveQuery, init?: ApiInit): Promise<PriceResolution> {
  return apiGet<PriceResolution>('/admin/pricing/resolve', { ...query }, init);
}
