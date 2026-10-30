// RefundActions: the buttons at the end of a refund row. Ports the `a` column of tabRefunds in 53-p-refunds.js: Approve… and
// Decline for a request that waits for a person, Retry for a refund that failed at the gateway, nothing otherwise.
import { Button, Icon } from '@/components/ui';
import type { RefundGrants } from '../hooks/useRefundGrants';
import type { Refund } from '../types';

export interface RefundActionsProps {
  refund: Refund;
  grants: RefundGrants;
  onApprove: (refund: Refund) => void;
  onDecline: (refund: Refund) => void;
  onRetry: (refund: Refund) => void;
  /** True while this refund's retry is running. */
  retrying: boolean;
}

export function RefundActions({
  refund,
  grants,
  onApprove,
  onDecline,
  onRetry,
  retrying,
}: RefundActionsProps) {
  // Hint only: the server checks `refunds:approve` again.
  const lock = grants.needs('refunds:approve');
  if (refund.status === 'requested') {
    return (
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="primary"
          disabled={lock.disabled}
          title={lock.title}
          onClick={() => onApprove(refund)}
        >
          Approve…
        </Button>
        <Button size="sm" disabled={lock.disabled} title={lock.title} onClick={() => onDecline(refund)}>
          Decline
        </Button>
      </div>
    );
  }
  if (refund.status === 'failed') {
    return (
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="primary"
          disabled={lock.disabled}
          title={lock.title}
          loading={retrying}
          onClick={() => onRetry(refund)}
        >
          <Icon name="refresh" className="ic-xs" />
          Retry
        </Button>
      </div>
    );
  }
  return null;
}
