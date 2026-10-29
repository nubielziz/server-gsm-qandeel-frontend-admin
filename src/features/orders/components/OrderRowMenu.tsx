// OrderRowMenu: the "⋯" menu at the end of each table row. Ports the `order-menu` action of 41-p-orders.js: open the
// details, copy the input, and the actions that fit the order's state. Actions that need a permission the staff member
// lacks are shown disabled.
import { useNavigate } from 'react-router';
import { Button, copyText, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import type { OrderGrants } from '../hooks/useOrderGrants';
import { orderActions } from '../lib/actions';
import { orderLabel } from '../lib/status';
import type { Order } from '../types';

export interface OrderRowMenuProps {
  order: Order;
  grants: OrderGrants;
  onOpen: (order: Order) => void;
  onComplete: (order: Order) => void;
  onReject: (order: Order) => void;
  onRetry: (order: Order) => void;
  onRefund: (order: Order) => void;
  /** A Retry from a row menu is still on its way: no second send until it answers. */
  sending?: boolean;
}

/** The items depend on the order's state (held, open, completed); the server still checks whatever is chosen. */
export function OrderRowMenu({
  order,
  grants,
  onOpen,
  onComplete,
  onReject,
  onRetry,
  onRefund,
  sending = false,
}: OrderRowMenuProps) {
  const pop = usePopover();
  const navigate = useNavigate();
  const can = orderActions(order);
  const noUpdate = !grants.can('orders:update');
  const label = orderLabel(order);

  const items: MenuItem[] = [
    { label: 'Open details', icon: 'panel', run: () => onOpen(order) },
    { label: 'Copy IMEI / input', icon: 'copy', run: () => void copyText(order.imei, 'Copied') },
  ];
  if (can.riskLink) {
    items.push(
      { separator: true },
      { label: 'Open the Risk queue', icon: 'shield', run: () => void navigate('/risk?tab=queue') },
    );
  } else if (can.complete) {
    items.push(
      { separator: true },
      { label: 'Complete…', icon: 'check', disabled: noUpdate, run: () => onComplete(order) },
    );
    if (can.retry) {
      items.push({
        label: `Retry on ${order.supplier?.name ?? 'the supplier'}`,
        icon: 'refresh',
        disabled: noUpdate || sending,
        run: () => onRetry(order),
      });
    }
    items.push({
      label: order.channel === 'b2c' ? 'Cancel and refund…' : 'Reject…',
      icon: 'ban',
      danger: true,
      disabled: noUpdate,
      run: () => onReject(order),
    });
  } else if (can.refund) {
    items.push(
      { separator: true },
      { label: 'Refund…', icon: 'undo', disabled: !grants.can('orders:reopen'), run: () => onRefund(order) },
    );
  } else if (can.refundsLink) {
    items.push(
      { separator: true },
      { label: 'Refund in Refunds', icon: 'undo', run: () => void navigate('/refunds') },
    );
  }

  return (
    <>
      <Button
        ref={pop.anchorRef}
        variant="ghost"
        size="sm"
        icon
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="more" className="ic-sm" />
      </Button>
      <Menu {...pop.panelProps} items={items} width={220} label={`Actions for ${label}`} />
    </>
  );
}
