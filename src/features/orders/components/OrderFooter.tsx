// OrderFooter: the sticky action bar of the drawer. Ports the `foot` of orderDrawer in 41-p-orders.js and adds the map's accept,
// fetch, verification and reopen. The black button is the action the page recommends for the state (DESIGN.md "The Ink Primary
// Rule"): on an order stopped by a supplier timeout it is Fetch or Retry, not Complete. Buttons the staff member lacks the
// permission for are disabled with the reason; the server decides in the end.
import { Button, ButtonLink, Icon, toast } from '@/components/ui';
import type { OrderGrants } from '../hooks/useOrderGrants';
import { useAcceptOrder, useFetchOrderResult, useReplyOrder } from '../hooks/useOrderMutations';
import { orderActions } from '../lib/actions';
import { replyFieldId } from '../lib/reply';
import type { Order } from '../types';
import type { OrderDialogState } from './orderDialogState';
import { RetryMenu } from './RetryMenu';

export interface OrderFooterProps {
  order: Order;
  grants: OrderGrants;
  /** What is in the reply box; Complete sends it. */
  reply: string;
  onDialog: (dialog: OrderDialogState) => void;
  onClose: () => void;
}

export function OrderFooter({ order, grants, reply, onDialog, onClose }: OrderFooterProps) {
  const can = orderActions(order);
  const accept = useAcceptOrder();
  const fetchResult = useFetchOrderResult();
  const complete = useReplyOrder({ onViewLedger: (done) => onDialog({ kind: 'ledger', order: done }) });
  const update = grants.needs('orders:update');
  const reopen = grants.needs('orders:reopen');
  const variant = (action: typeof can.recommended) => (can.recommended === action ? 'primary' : 'default');
  const close = <Button onClick={onClose}>Close</Button>;

  if (can.riskLink) {
    return (
      <>
        <ButtonLink variant="primary" to="/risk?tab=queue">
          <Icon name="shield" className="ic-sm" />
          Open the Risk queue
        </ButtonLink>
        <span className="flex-1" />
        {close}
      </>
    );
  }

  if (can.open) {
    const sendReply = () => {
      const code = reply.trim();
      if (!code) {
        document.getElementById(replyFieldId(order))?.focus();
        toast({
          kind: 'error',
          title: 'Write a reply first',
          body: 'The merchant sees it as the order result.',
        });
        return;
      }
      complete.mutate({ order, body: { code } });
    };
    return (
      <>
        {can.accept && (
          <Button
            variant={variant('accept')}
            loading={accept.isPending}
            disabled={update.disabled}
            title={update.title}
            onClick={() => accept.mutate(order)}
          >
            <Icon name="play" className="ic-sm" />
            Accept
          </Button>
        )}
        {can.complete && (
          <Button
            variant={variant('complete')}
            loading={complete.isPending}
            disabled={update.disabled}
            title={update.title}
            onClick={sendReply}
          >
            <Icon name="check" className="ic-sm" />
            Complete
          </Button>
        )}
        {can.fetch && (
          <Button
            variant={variant('fetch')}
            loading={fetchResult.isPending}
            disabled={update.disabled}
            title={update.title}
            onClick={() => fetchResult.mutate(order)}
          >
            <Icon name="download" className="ic-sm" />
            Fetch result
          </Button>
        )}
        {can.retry && <RetryMenu order={order} grants={grants} primary={can.recommended === 'retry'} />}
        <span className="flex-1" />
        {can.reject && (
          <Button
            variant="danger"
            disabled={update.disabled}
            title={update.title}
            onClick={() => onDialog({ kind: 'reject', orders: [order] })}
          >
            <Icon name="ban" className="ic-sm" />
            {order.channel === 'b2c' ? 'Cancel and refund…' : 'Reject…'}
          </Button>
        )}
      </>
    );
  }

  return (
    <>
      {can.verify && (
        <>
          <Button
            variant="primary"
            disabled={update.disabled}
            title={update.title}
            onClick={() => onDialog({ kind: 'verify', order, decision: 'accept' })}
          >
            <Icon name="checkCircle" className="ic-sm" />
            Accept result
          </Button>
          <Button
            variant="danger"
            disabled={update.disabled}
            title={update.title}
            onClick={() => onDialog({ kind: 'verify', order, decision: 'refund' })}
          >
            <Icon name="undo" className="ic-sm" />
            Refund…
          </Button>
        </>
      )}
      <span className="flex-1 text-xs text-ink3">
        {can.refund
          ? 'Delivered and paid. A refund after delivery loses the supplier cost.'
          : can.refundsLink
            ? 'Storefront orders are refunded from Refunds.'
            : order.status === 'completed'
              ? 'Delivered and paid.'
              : 'This order is closed.'}
      </span>
      {can.reopen && (
        <Button
          disabled={reopen.disabled}
          title={reopen.title}
          onClick={() => onDialog({ kind: 'reopen', order })}
        >
          <Icon name="refresh" className="ic-sm" />
          Reopen…
        </Button>
      )}
      {can.refund && (
        <Button
          disabled={reopen.disabled}
          title={reopen.title}
          onClick={() => onDialog({ kind: 'refund', order })}
        >
          <Icon name="undo" className="ic-sm" />
          Refund…
        </Button>
      )}
      {can.refundsLink && (
        <ButtonLink to="/refunds">
          <Icon name="undo" className="ic-sm" />
          Open Refunds
        </ButtonLink>
      )}
      {close}
    </>
  );
}
