// ServiceRowMenu: the "⋯" menu at the end of each service row. Ports the `svc-menu` action of 43-p-services.js (Edit price, Trace a
// merchant price, See orders) and adds the actions the map gives a service: edit, group prices, fields, options and delete.
// Actions that need a permission the staff member lacks are shown disabled, with the missing permission in the title.
import { useNavigate } from 'react-router';
import { Button, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import { ordersListPath } from '@/features/orders';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { servicesListPath } from '../lib/paths';
import type { Service } from '../types';
import type { ServiceDialogState } from './serviceDialogState';

export interface ServiceRowMenuProps {
  service: Service;
  grants: ServiceGrants;
  onDialog: (dialog: ServiceDialogState) => void;
}

/** The row's actions; the page owns the dialogs they open. */
export function ServiceRowMenu({ service, grants, onDialog }: ServiceRowMenuProps) {
  const pop = usePopover();
  const navigate = useNavigate();
  const update = grants.needs('catalog:update');
  const groups = grants.needsAll('pricing:update', 'groups:read');
  const trace = grants.needsAll('pricing:read', 'catalog:read');
  const orders = grants.needs('orders:read');
  const remove = grants.needs('catalog:delete');

  // A menu item has no title, so a locked one shows only as disabled; the buttons on the page name the missing permission.
  const items: MenuItem[] = [
    {
      label: 'Edit price…',
      icon: 'edit',
      disabled: update.disabled,
      run: () => onDialog({ kind: 'price', service }),
    },
    {
      label: 'Edit service…',
      icon: 'panel',
      disabled: update.disabled,
      run: () => onDialog({ kind: 'edit', service }),
    },
    {
      label: 'Group prices…',
      icon: 'users',
      disabled: groups.disabled,
      run: () => onDialog({ kind: 'groups', service }),
    },
    {
      label: 'Fields…',
      icon: 'sliders',
      disabled: update.disabled,
      run: () => onDialog({ kind: 'fields', service }),
    },
    {
      label: 'Options…',
      icon: 'layers',
      disabled: update.disabled,
      run: () => onDialog({ kind: 'options', service }),
    },
    { separator: true },
    {
      label: 'Trace a merchant price',
      icon: 'scale',
      disabled: trace.disabled,
      run: () => void navigate(servicesListPath({ tab: 'resolver', service: service.id })),
    },
    {
      label: 'See orders',
      icon: 'orders',
      disabled: orders.disabled,
      run: () => void navigate(ordersListPath({ tab: 'all', q: service.name })),
    },
    { separator: true },
    {
      label: 'Delete…',
      icon: 'x',
      danger: true,
      disabled: remove.disabled,
      run: () => onDialog({ kind: 'delete', service }),
    },
  ];

  return (
    <>
      <Button
        ref={pop.anchorRef}
        variant="ghost"
        size="sm"
        icon
        aria-label={`Actions for ${service.name}`}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="more" className="ic-sm" />
      </Button>
      <Menu {...pop.panelProps} items={items} width={220} label={`Actions for ${service.name}`} />
    </>
  );
}
