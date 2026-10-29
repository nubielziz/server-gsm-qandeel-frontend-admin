// RetryMenu: the "Retry or reroute" button of the drawer footer. Ports the `o-retry` action of 41-p-orders.js: send the order to
// its supplier again, or to another enabled supplier (a supplier that is down is shown disabled). Without `suppliers:read`
// only the retry on the current supplier is offered.
import { Button, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import { useSupplierOptions } from '../hooks/useLookups';
import type { OrderGrants } from '../hooks/useOrderGrants';
import { useDispatchOrder, useRerouteOrder } from '../hooks/useOrderMutations';
import type { Order } from '../types';

export interface RetryMenuProps {
  order: Order;
  grants: OrderGrants;
  /** The page recommends this action, so the button is the black primary one. */
  primary: boolean;
}

export function RetryMenu({ order, grants, primary }: RetryMenuProps) {
  const pop = usePopover();
  const suppliers = useSupplierOptions(grants.can('suppliers:read'));
  const dispatch = useDispatchOrder();
  const reroute = useRerouteOrder();
  const lock = grants.needs('orders:update');

  const items: MenuItem[] = [
    {
      label: order.supplier ? `Retry on ${order.supplier.name}` : 'Send to a supplier',
      icon: 'refresh',
      run: () => dispatch.mutate(order),
    },
    ...(suppliers.data ?? [])
      .filter((supplier) => supplier.enabled !== false && supplier.id !== order.supplier?.id)
      .map((supplier): MenuItem => ({
        label: `Reroute to ${supplier.name}${supplier.status === 'degraded' || supplier.status === 'down' ? ` (${supplier.status})` : ''}`,
        icon: 'server',
        disabled: supplier.status === 'down',
        run: () => reroute.mutate({ order, supplier }),
      })),
  ];

  return (
    <>
      <Button
        ref={pop.anchorRef}
        variant={primary ? 'primary' : 'default'}
        disabled={lock.disabled}
        title={lock.title}
        loading={dispatch.isPending || reroute.isPending}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="refresh" className="ic-sm" />
        Retry or reroute
        <Icon name="chevD" className="ic-xs" />
      </Button>
      <Menu {...pop.panelProps} items={items} align="start" width={240} label="Retry or reroute" />
    </>
  );
}
