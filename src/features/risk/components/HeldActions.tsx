// HeldActions: the bar at the bottom of a held order's card: Approve and send, Refund and block, Refund only. Ports the last
// block of `heldCard` in 54-p-risk.js. The buttons need `risk:decide`; without it they are disabled and say so (a hint only).
import { Button, Icon } from '@/components/ui';
import type { RiskGrants } from '../hooks/useRiskGrants';
import { RISK_PERMISSION } from '../lib/permissions';

export interface HeldActionsProps {
  grants: RiskGrants;
  /** True while this order's approval is being sent. */
  approving: boolean;
  onApprove: () => void;
  /** `block` is the demo's "Refund and block"; the dialog opens with the email block ticked. */
  onRefund: (block: boolean) => void;
}

export function HeldActions({ grants, approving, onApprove, onRefund }: HeldActionsProps) {
  const decide = grants.needs(RISK_PERMISSION.decide);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-b-lg border-t border-line bg-sunken px-3.5 py-2.5">
      <Button variant="primary" loading={approving} {...decide} onClick={onApprove}>
        <Icon name="check" className="ic-sm" />
        Approve and send
      </Button>
      <Button variant="danger" {...decide} onClick={() => onRefund(true)}>
        <Icon name="ban" className="ic-sm" />
        Refund and block
      </Button>
      <Button {...decide} onClick={() => onRefund(false)}>
        <Icon name="undo" className="ic-sm" />
        Refund only
      </Button>
      <span className="flex-1" />
      <span className="text-xs text-ink3">The supplier has not been contacted.</span>
    </div>
  );
}
