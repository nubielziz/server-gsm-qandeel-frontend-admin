// The audit entries about one merchant for the Audit tab: the audit feature's list with `entityType=merchant&entityId=<id>`, newest
// first. "Show more" asks for a longer range from the start rather than keeping pages apart, so the list is always one answer.
import { listAuditLogs } from '@/features/audit';
import { useApiQuery } from '@/lib/query';
import { MERCHANT_AUDIT_KEY } from './keys';

/** The first `limit` entries about the merchant. Pass `enabled: false` without `audit:read`. */
export function useMerchantAudit(clientId: number, limit: number, enabled = true) {
  return useApiQuery({
    queryKey: [...MERCHANT_AUDIT_KEY, clientId, limit],
    queryFn: ({ signal }) =>
      listAuditLogs(
        {
          start: 0,
          end: limit,
          sort: ['createdAt'],
          order: ['desc'],
          filters: { entityType: 'merchant', entityId: clientId },
        },
        { signal },
      ),
    enabled,
    // Keep the entries on screen while a longer range loads.
    placeholderData: (previous) => previous,
  });
}
