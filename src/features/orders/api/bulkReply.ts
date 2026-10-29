// Bulk reply (`POST /admin/orders/bulk-reply/*`): paste IMEI + CODE lines, see which orders they match, then apply.
// Also the way "Complete" works for many selected orders at once (one code for each). No demo screen has the paste
// flow; it is built in the demo's style (feature brief). Shapes are assumed contracts (MISMATCHES M10).
import { apiPost, type ApiInit } from '@/lib/api';
import type { BulkReplyApplyBody, BulkReplyPreview, BulkReplyPreviewBody, BulkReplyResult } from '../types';

/**
 * Reads the pasted lines (an IMEI or other input, then the code, per line) and says which open order each one
 * matches: matched, not found, ambiguous (several open orders), invalid (no code) or not open. Nothing changes.
 * Assumed contract: body `{ text }`, answer `{ lines: [{ line, raw, imei, code, orderId, status }] }`.
 * @route POST /admin/orders/bulk-reply/preview
 */
export function previewBulkReply(body: BulkReplyPreviewBody, init?: ApiInit): Promise<BulkReplyPreview> {
  return apiPost<BulkReplyPreview>('/admin/orders/bulk-reply/preview', body, init);
}

/**
 * Completes the matched orders, each with its own code. The server checks every order again and settles the money;
 * the answer says how many went through and why the others did not.
 * Assumed contract: body `{ items: [{ orderId, code }] }`, answer `{ applied, failed: [{ orderId, title }] }`.
 * @route POST /admin/orders/bulk-reply/apply
 */
export function applyBulkReply(body: BulkReplyApplyBody, init?: ApiInit): Promise<BulkReplyResult> {
  return apiPost<BulkReplyResult>('/admin/orders/bulk-reply/apply', body, init);
}
