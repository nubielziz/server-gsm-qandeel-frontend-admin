// The bulk reply: preview what the pasted lines match, then apply. Ports nothing from the demo (it has no paste flow);
// the same apply call completes many selected orders with one code (MISMATCHES M23).
import { useApiMutation } from '@/lib/query';
import { applyBulkReply, previewBulkReply } from '../api';
import type { BulkReplyApplyBody, BulkReplyPreviewBody } from '../types';
import { ORDER_STALE_KEYS, staleOrders } from './keys';

/** Reads the pasted text; changes nothing. The dialog shows a failure. */
export function usePreviewBulkReply() {
  return useApiMutation({
    mutationFn: (body: BulkReplyPreviewBody) => previewBulkReply(body),
    errorNotification: () => false,
  });
}

/** Completes the matched orders. The dialog shows the summary, so there is no toast of its own. */
export function useApplyBulkReply() {
  return useApiMutation({
    mutationFn: (body: BulkReplyApplyBody) => applyBulkReply(body),
    invalidates: (_result, body) => staleOrders(...body.items.map((item) => item.orderId)),
    invalidateKeys: ORDER_STALE_KEYS,
    errorNotification: () => false,
  });
}
