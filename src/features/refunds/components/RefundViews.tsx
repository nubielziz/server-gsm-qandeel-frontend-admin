// The three tables of the refunds feature as views of the Money page (decision 026): Refunds and Card disputes (Money back), Shop payments
// (Money in). Each view is one table with its own filters and dialogs; the order links open the order drawer in place (`?order=<id>`).
import type { ReactNode } from 'react';
import { Panel, SkeletonTable } from '@/components/ui';
import { OrderDrawerHost } from '@/features/orders';
import { useOrderOpener } from '../hooks/useOrderOpener';
import { useRefundGrants, type RefundGrants } from '../hooks/useRefundGrants';
import { DisputesTab } from './DisputesTab';
import { PaymentsTab } from './PaymentsTab';
import { RefundsTab } from './RefundsTab';

type OrderLinkedViewProps = {
  children: (view: { grants: RefundGrants; onOpenOrder?: (orderId: number) => void }) => ReactNode;
};

/**
 * What the three views share: the staff member's grants and the order drawer. The order links and the drawer need the right to read
 * orders; without it the numbers are plain text. Until the permissions are known a skeleton stands in, so a table never flashes empty.
 */
function OrderLinkedView({ children }: OrderLinkedViewProps) {
  const grants = useRefundGrants();
  const opener = useOrderOpener();
  const canReadOrders = grants.can('orders:read');
  return (
    <>
      {grants.ready ? (
        children({ grants, onOpenOrder: canReadOrders ? opener : undefined })
      ) : (
        <Panel flush>
          <SkeletonTable cols={6} rows={6} />
        </Panel>
      )}
      {canReadOrders && <OrderDrawerHost />}
    </>
  );
}

/** Money back › Refunds: the refunds with their status filter, and the approve, decline and retry actions. */
export function RefundsView() {
  return (
    <OrderLinkedView>
      {({ grants, onOpenOrder }) => <RefundsTab grants={grants} onOpenOrder={onOpenOrder} />}
    </OrderLinkedView>
  );
}

/** Money back › Card disputes: the disputes with their evidence deadline, the evidence pack and the accept-the-loss confirm. */
export function DisputesView() {
  return (
    <OrderLinkedView>
      {({ grants, onOpenOrder }) => <DisputesTab grants={grants} onOpenOrder={onOpenOrder} />}
    </OrderLinkedView>
  );
}

/** Money in › Shop payments: the comparison of payment methods and the shop payments with their method filter. */
export function ShopPaymentsView() {
  return (
    <OrderLinkedView>
      {({ grants, onOpenOrder }) => <PaymentsTab grants={grants} onOpenOrder={onOpenOrder} />}
    </OrderLinkedView>
  );
}
