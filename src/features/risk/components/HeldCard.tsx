// HeldCard: one held order as the demo's card: the order and score on top, why it was held and who is buying in the middle,
// the decision buttons below. Ports `heldCard` of 54-p-risk.js.
import { orderLabel } from '@/features/orders';
import type { RiskGrants } from '../hooks/useRiskGrants';
import type { HeldOrder } from '../types';
import { HeldActions } from './HeldActions';
import { HeldDetails } from './HeldDetails';
import { HeldHead } from './HeldHead';

export interface HeldCardProps {
  order: HeldOrder;
  grants: RiskGrants;
  now: number;
  approving: boolean;
  onApprove: (order: HeldOrder) => void;
  onRefund: (order: HeldOrder, block: boolean) => void;
}

export function HeldCard({ order, grants, now, approving, onApprove, onRefund }: HeldCardProps) {
  return (
    <article className="panel" aria-label={`Held order ${orderLabel({ id: order.orderId, channel: 'b2c' })}`}>
      <HeldHead order={order} now={now} />
      <HeldDetails order={order} />
      <HeldActions
        grants={grants}
        approving={approving}
        onApprove={() => onApprove(order)}
        onRefund={(block) => onRefund(order, block)}
      />
    </article>
  );
}
