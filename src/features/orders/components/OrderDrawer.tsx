// OrderDrawer: the 580px side sheet of one order (the demo's `order-open` action and orderDrawer in 41-p-orders.js): banner,
// facts, money, result, the reply box, the timeline and the action bar. It reads the order again so it stays fresh after an
// action, and opens every dialog through `onDialog`. A deep link (`?order=<id>`) has no list row, so it loads the order first.
import { useState } from 'react';
import { Drawer, ErrorState, SkeletonTable, TypeTag } from '@/components/ui';
import { ago, fmtDate, useNow } from '@/lib/format';
import { useOrder, useOrderEvents } from '../hooks/useOrder';
import { useOrderGrants } from '../hooks/useOrderGrants';
import { defaultReply } from '../lib/reply';
import { isHeld, isOpen, orderLabel, sourceLabel } from '../lib/status';
import type { Order } from '../types';
import { OrderBanner } from './OrderBanner';
import { OrderDetails } from './OrderDetails';
import type { OrderDialogState } from './orderDialogState';
import { OrderFooter } from './OrderFooter';
import { OrderMoney } from './OrderMoney';
import { OrderReply } from './OrderReply';
import { OrderResult } from './OrderResult';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderTimeline } from './OrderTimeline';

export interface OrderDrawerProps {
  id: number;
  /** The row from the list, shown at once while the single-order read loads. */
  row?: Order;
  onClose: () => void;
  onDialog: (dialog: OrderDialogState) => void;
}

export function OrderDrawer({ id, row, onClose, onDialog }: OrderDrawerProps) {
  const grants = useOrderGrants();
  const now = useNow();
  const { order, query } = useOrder(id, row);
  const events = useOrderEvents(id);
  // The reply the footer's Complete sends; `null` until the operator edits it, so it follows the order's default.
  const [draft, setDraft] = useState<string | null>(null);

  if (!order) {
    return (
      <Drawer
        open
        onClose={onClose}
        title={`Order ${id}`}
        titleClassName="mono"
        footer={<span className="flex-1" />}
      >
        {query.isError ? (
          <ErrorState
            title="Could not load this order"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <SkeletonTable cols={2} rows={6} />
        )}
      </Drawer>
    );
  }

  const reply = draft ?? defaultReply(order);
  return (
    <Drawer
      open
      onClose={onClose}
      title={orderLabel(order)}
      titleClassName="mono"
      badges={
        <>
          <OrderStatusBadge order={order} />
          {order.channel === 'b2c' && <TypeTag>Storefront</TypeTag>}
        </>
      }
      sub={`Created ${fmtDate(order.createdAt)} via ${sourceLabel(order.source)} · ${ago(order.createdAt, now)}`}
      footer={
        <OrderFooter order={order} grants={grants} reply={reply} onDialog={onDialog} onClose={onClose} />
      }
    >
      <OrderBanner order={order} />
      <OrderDetails order={order} now={now} grants={grants} />
      <OrderMoney
        order={order}
        grants={grants}
        onTrace={() => onDialog({ kind: 'trace', order })}
        onLedger={() => onDialog({ kind: 'ledger', order })}
      />
      <OrderResult order={order} events={events.data} canDownload={grants.can('files:read')} />
      {isOpen(order) && !isHeld(order) && grants.can('orders:update') && (
        <OrderReply order={order} value={reply} onChange={setDraft} />
      )}
      <OrderTimeline order={order} grants={grants} />
    </Drawer>
  );
}
