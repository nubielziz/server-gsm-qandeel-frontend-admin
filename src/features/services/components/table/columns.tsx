// The columns of the Catalog table (service, type, supplier and cost, merchant price, shop price, shop switch, Enabled, menu). Ports `cols`
// of servicesTab in 43-p-services.js; the shop columns show only when the server sent their keys. While a service's side panel is open
// the table is compact: it keeps the columns a person acts on and leaves the rest to the panel.
import type { ReactNode } from 'react';
import { Switch, TypeTag, type DataTableColumn } from '@/components/ui';
import { pct } from '@/lib/format';
import type { PanelSection } from '../../hooks/useServiceView';
import { TYPE_LABEL } from '../../lib/status';
import type { Service } from '../../types';
import { PriceCell } from '../PriceCell';
import { ServiceCell } from './ServiceCell';
import { ShopPriceCell } from './ShopPriceCell';
import { SupplierCostCell } from './SupplierCostCell';

/** What the columns need from the table: the locks, the busy rows, the actions and which shop columns to draw. */
export type CatalogColumnsArgs = {
  /** Props for the Enabled switch when the staff member lacks `catalog:update`. */
  lock: { disabled: boolean; title?: string };
  /**
   * Props for the price button. A price is saved with `catalog:update` and `pricing:update` (the server refuses the body without
   * the second), so the button asks for both; a role that lacks one sees the price as plain text with the missing one named.
   */
  priceLock: { disabled: boolean; title?: string };
  /** The service whose Enabled switch is saving. */
  busyId?: number;
  /** The rows carry a shop price (`retailPrice`). */
  shopPrice: boolean;
  /** The rows carry their shop page (`listingId`): the role may read the shop. */
  onShop: boolean;
  /** A service's side panel is open beside the table: only the service, merchant price, shop switch, Enabled switch and menu stay. */
  compact?: boolean;
  /** The service whose panel is open; its name button is marked as the current one. */
  openId?: number;
  onOpen: (service: Service, section?: PanelSection) => void;
  onToggleStatus: (service: Service, on: boolean) => void;
  onEditPrice: (service: Service) => void;
  /** The "On the shop" cell of a row. */
  shopCell: (service: Service) => ReactNode;
  /** The "⋯" menu of a row. */
  menu: (service: Service) => ReactNode;
};

/** The columns, in the order the table draws them. */
export function catalogColumns(args: CatalogColumnsArgs): DataTableColumn<Service>[] {
  const { lock, priceLock, busyId, compact = false } = args;
  const columns: (DataTableColumn<Service> | false)[] = [
    {
      key: 'name',
      label: 'Service',
      sortField: 'name',
      render: (s) => <ServiceCell service={s} open={s.id === args.openId} onOpen={args.onOpen} />,
    },
    !compact && {
      key: 'type',
      label: 'Type',
      sortField: 'type',
      hide: 'md',
      render: (s) => <TypeTag>{TYPE_LABEL[s.type]}</TypeTag>,
    },
    !compact && {
      key: 'supplier',
      label: 'Supplier and cost',
      sortField: 'cost',
      hide: 'lg',
      render: (s) => <SupplierCostCell service={s} />,
    },
    {
      key: 'price',
      label: 'Merchant price',
      num: true,
      sortField: 'basePrice',
      // The amber tint for a thin margin is the demo's (below 5%); the margin itself is the server's figure.
      render: (s) => (
        <>
          <PriceCell service={s} lock={priceLock} onEdit={args.onEditPrice} />
          <span className="block text-xs text-ink3">
            <span className={Number(s.marginPct) < 5 ? 'font-medium text-warn-fg' : undefined}>
              {pct(s.marginPct, 1)}
            </span>{' '}
            margin
          </span>
        </>
      ),
    },
    args.shopPrice &&
      !compact && {
        key: 'shopPrice',
        label: 'Shop price',
        num: true,
        sortField: 'retailPrice',
        hide: 'sm',
        render: (s) => <ShopPriceCell service={s} />,
      },
    args.onShop && { key: 'onShop', label: 'On shop', render: args.shopCell },
    {
      key: 'enabled',
      label: 'Enabled',
      render: (s) => (
        <Switch
          checked={s.status === 'active'}
          label={`Enable ${s.name}`}
          disabled={lock.disabled || busyId === s.id}
          title={lock.title}
          onChange={(on) => args.onToggleStatus(s, on)}
        />
      ),
    },
    { key: 'more', label: '', className: 'w-10', render: args.menu },
  ];
  return columns.filter((column): column is DataTableColumn<Service> => column !== false);
}
