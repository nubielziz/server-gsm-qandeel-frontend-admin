// InventoryToolbar: the filters above the code stock (service and status), Clear filters and the live count. The service menu
// is left out without `catalog:read`, because the names come from the services list.
import { Button, SelectField, TableToolbar, type SelectOption } from '@/components/ui';
import { num } from '@/lib/format';
import { withChosen } from '../lib/select';
import type { NamedRef } from '../types';

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'void', label: 'Void' },
];

export interface InventoryToolbarProps {
  serviceId: number | null;
  status: string;
  /** The names for the service menu; `undefined` leaves the menu out. */
  services?: readonly NamedRef[];
  total: number | undefined;
  onService: (id: string) => void;
  onStatus: (status: string) => void;
  onClear: () => void;
}

/** Service and status filters above the code stock. */
export function InventoryToolbar({
  serviceId,
  status,
  services,
  total,
  onService,
  onStatus,
  onClear,
}: InventoryToolbarProps) {
  // A linked service stays visible while the names load.
  const options = withChosen(
    [
      { value: '', label: 'All services' },
      ...(services ?? []).map((service) => ({ value: service.id, label: service.name })),
    ],
    serviceId,
    `Service ${serviceId}`,
  );
  return (
    <TableToolbar count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'code' : 'codes'}`}>
      {services && (
        <SelectField
          aria-label="Filter by service"
          value={serviceId ?? ''}
          options={options}
          onChange={(event) => onService(event.target.value)}
        />
      )}
      <SelectField
        aria-label="Filter by status"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(event) => onStatus(event.target.value)}
      />
      {(serviceId !== null || status !== '') && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
