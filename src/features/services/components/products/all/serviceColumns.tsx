// The columns of the table of the All view, in the reference's order: [checkbox] Service Name | API | Group | Status | Shop | Actions.
// The checkbox column is the table's own (a `selection`). The Shop column is drawn only for a role that may read the shop, because only
// then do the rows carry their shop page. Every figure and every word is the server's.
import { ButtonLink, Icon, type DataTableColumn } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import { productsPath } from '../../../lib/productsPath';
import type { Service } from '../../../types';
import { ApiCell } from './ApiCell';
import { ServiceNameCell } from './ServiceNameCell';
import { ShopCell, StatusCell } from './SwitchCells';

/** What the columns need from the view: the kind (for the edit link), the grants and the two runners of the squares. */
export type ServiceColumnsArgs = {
  type: ServiceType;
  grants: ServiceGrants;
  /** The rows carry their shop page: the role may read the shop. */
  shop: boolean;
  status: { toggle: (service: Service) => void; isBusy: (id: Id) => boolean };
  shopSwitch: { toggle: (service: Service, on: boolean) => void; isBusy: (id: Id) => boolean };
};

/** The columns, in the order the table draws them. */
export function serviceColumns({
  type,
  grants,
  shop,
  status,
  shopSwitch,
}: ServiceColumnsArgs): DataTableColumn<Service>[] {
  const columns: (DataTableColumn<Service> | false)[] = [
    { key: 'name', label: 'Service Name', render: (service) => <ServiceNameCell service={service} /> },
    {
      key: 'api',
      label: 'API',
      hide: 'md',
      className: 'w-[18%]',
      render: (service) => <ApiCell service={service} />,
    },
    {
      key: 'group',
      label: 'Group',
      hide: 'sm',
      className: 'w-[22%]',
      render: (service) => service.category?.name ?? '',
    },
    {
      key: 'status',
      label: 'Status',
      className: 'w-16 text-center',
      render: (service) => (
        <StatusCell
          service={service}
          grants={grants}
          busy={status.isBusy(service.id)}
          onToggle={status.toggle}
        />
      ),
    },
    shop && {
      key: 'shop',
      label: 'Shop',
      className: 'w-16 text-center',
      render: (service) => (
        <ShopCell
          service={service}
          grants={grants}
          busy={shopSwitch.isBusy(service.id)}
          onToggle={shopSwitch.toggle}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-20 text-end',
      render: (service) => (
        <ButtonLink
          to={productsPath({ view: 'edit', type, id: service.id })}
          variant="ghost"
          size="sm"
          icon
          aria-label={`Edit ${service.name}`}
          title="Edit"
        >
          <Icon name="squarePen" className="ic-sm" />
        </ButtonLink>
      ),
    },
  ];
  return columns.filter((column): column is DataTableColumn<Service> => column !== false);
}
