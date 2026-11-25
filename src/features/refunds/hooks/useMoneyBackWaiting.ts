// What waits for a person on Money back: the number the Money back tab and its Refunds and Card disputes links show on the Money page.
import { useDisputesNeedingEvidence, useWaitingRefunds } from './useRefundFigures';
import { useRefundGrants } from './useRefundGrants';

/**
 * What waits for a person on Money back: refunds to decide or retry (`refunds`: requested plus failed) and disputes that need evidence
 * (`disputes`). Each is undefined while unknown, or when the staff member may not read it (no call is made then). It reads the same
 * queries as the Overview figures (same keys), so approving a refund or answering a dispute updates the count at once.
 */
export function useMoneyBackWaiting(): { refunds?: number; disputes?: number } {
  const grants = useRefundGrants();
  const { requested, failed } = useWaitingRefunds(grants.ready && grants.can('refunds:read'));
  const disputes = useDisputesNeedingEvidence(grants.ready && grants.can('disputes:read'));
  return {
    refunds: requested !== undefined && failed !== undefined ? requested + failed : undefined,
    disputes: disputes.data?.count,
  };
}
