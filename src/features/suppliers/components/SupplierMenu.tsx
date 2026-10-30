// SupplierMenu: the "⋯" menu of the supplier detail. Ports the `sup-menu` action of 44-p-suppliers.js (copy the base URL, see its
// orders, Disable or Enable) and adds what the API allows: reroute its open orders, edit the connection and delete it.
// Items that need a permission the staff member lacks are shown disabled.
import { useNavigate } from 'react-router';
import { Button, copyText, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import { ordersListPath } from '@/features/orders';
import type { SupplierGrants } from '../hooks/useSupplierGrants';
import { isEnabled } from '../lib/state';
import type { Supplier, SupplierLink } from '../types';
import type { SupplierDialogState } from './supplierDialogState';

export interface SupplierMenuProps {
  supplier: Supplier;
  grants: SupplierGrants;
  /** The services linked to the supplier, once loaded: the Disable dialog counts them. */
  links: readonly SupplierLink[] | undefined;
  onDialog: (dialog: SupplierDialogState) => void;
  onEnable: (supplier: Supplier) => void;
}

/** The menu of one supplier; each item is disabled when its permission is missing, and the server still checks. */
export function SupplierMenu({ supplier, grants, links, onDialog, onEnable }: SupplierMenuProps) {
  const pop = usePopover();
  const navigate = useNavigate();
  const canUpdate = grants.can('suppliers:update');
  const canReroute = grants.can('orders:update') && grants.can('orders:read');

  const items: MenuItem[] = [
    { label: 'Copy base URL', icon: 'copy', run: () => void copyText(supplier.baseUrl, 'Copied base URL') },
    {
      label: 'See its orders',
      icon: 'orders',
      disabled: !grants.can('orders:read'),
      run: () => void navigate(ordersListPath({ tab: 'all', supplierId: String(supplier.id) })),
    },
    {
      label: 'Reroute open orders…',
      icon: 'refresh',
      disabled: !canReroute || supplier.openOrders === 0,
      run: () => onDialog({ kind: 'reroute', supplier }),
    },
    {
      label: 'Edit connection…',
      icon: 'edit',
      disabled: !canUpdate,
      run: () => onDialog({ kind: 'edit', supplier }),
    },
    { separator: true },
    isEnabled(supplier)
      ? {
          label: 'Disable supplier…',
          icon: 'ban',
          danger: true,
          disabled: !canUpdate,
          run: () => onDialog({ kind: 'disable', supplier, links }),
        }
      : { label: 'Enable supplier', icon: 'check', disabled: !canUpdate, run: () => onEnable(supplier) },
    {
      label: 'Delete supplier…',
      icon: 'x',
      danger: true,
      disabled: !grants.can('suppliers:delete'),
      run: () => onDialog({ kind: 'delete', supplier }),
    },
  ];

  return (
    <>
      <Button
        ref={pop.anchorRef}
        icon
        aria-label={`More actions for ${supplier.name}`}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="more" className="ic-sm" />
      </Button>
      <Menu {...pop.panelProps} items={items} width={220} label={`Actions for ${supplier.name}`} />
    </>
  );
}
