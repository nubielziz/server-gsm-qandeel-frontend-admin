// ServiceRowMenu: the "⋯" menu of a Catalog row. Ports `svc-menu` of 43-p-services.js (Edit price, Trace a merchant price, See orders) and
// adds edit, group prices, fields, options, delete and, for a service that has a shop page, its page and shop price (the storefront's
// dialogs). An action whose permission the staff member lacks is shown disabled.
import { useNavigate } from 'react-router';
import { Button, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import { ordersListPath } from '@/features/orders';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { catalogPath } from '../lib/paths';
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
  // A price is saved through the same route as the rest, but the server also needs pricing:update for it (decision 046).
  const price = grants.needsAll('catalog:update', 'pricing:update');
  const groups = grants.needsAll('pricing:update', 'groups:read');
  const trace = grants.needsAll('pricing:read', 'catalog:read');
  const orders = grants.needs('orders:read');
  const remove = grants.needs('catalog:delete');
  const shopPage = grants.needs('storefront:update');
  // A shop price is a listing change (storefront:update) that also needs pricing:update on the server (decision 046).
  const shopPrice = grants.needsAll('storefront:update', 'pricing:update');
  // Only a service that has a shop page gets its two items: one without a page is put on the shop with the row's switch.
  const listing: MenuItem[] =
    service.listingId != null
      ? [
          { separator: true },
          {
            label: 'Edit shop page…',
            icon: 'store',
            ...shopPage,
            run: () => onDialog({ kind: 'shop-page', service }),
          },
          {
            label: 'Shop price…',
            icon: 'tag',
            ...shopPrice,
            run: () => onDialog({ kind: 'shop-price', service }),
          },
        ]
      : [];

  // The older items show a lock only as disabled; the buttons on the page name the missing permission. The price and shop items carry
  // it as their title too (the price needs two permissions, so a role holding one is told which is missing).
  const items: MenuItem[] = [
    {
      label: 'Edit price…',
      icon: 'edit',
      ...price,
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
    ...listing,
    { separator: true },
    {
      label: 'Trace a merchant price',
      icon: 'scale',
      disabled: trace.disabled,
      run: () => void navigate(catalogPath({ view: 'settings', tab: 'resolver', service: service.id })),
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
