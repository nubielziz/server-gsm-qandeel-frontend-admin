// The bulk price change in two steps: preview what it would do, then apply it with the same body. The preview saves nothing.
// Both leave a failure to the dialog, which shows the server's words in its error slot.
import { useApiMutation } from '@/lib/query';
import { applyBulkPrice, previewBulkPrice } from '../api';
import type { BulkPriceBody } from '../types';
import { SERVICE_STALE_KEYS } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Asks the server for the old and new price of every service the change would touch. */
export function usePreviewBulkPrice() {
  return useApiMutation({
    mutationFn: (body: BulkPriceBody) => previewBulkPrice(body),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Applies the change that was previewed. Prices change for new orders only. */
export function useApplyBulkPrice() {
  return useApiMutation({
    mutationFn: (body: BulkPriceBody) => applyBulkPrice(body),
    invalidates: [{ resource: 'services' }],
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (result) => ({
      message: `${result.updated} ${result.updated === 1 ? 'price' : 'prices'} changed`,
      description:
        result.belowFloor > 0
          ? `${result.belowFloor} still ${result.belowFloor === 1 ? 'is' : 'are'} under the floor. New orders use the new prices.`
          : 'New orders use the new prices.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
