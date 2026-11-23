// InventoryToolbar: the Quick Search box above the code stock (service and status, Clear filters) and the refresh tool at its right, in the list
// grammar of the Product / Services page (the same box as the Inventory part of the editor, with the service menu added). The filters apply
// as soon as they are chosen. The service menu is left out without `catalog:read`, because the names come from the services list.
import { Button, LegendBox, RefreshTool, SelectField } from '@/components/ui';
import { withChosen } from '../lib/select';
import type { NamedRef } from '../types';
import { statusFilterOptions } from './products/edit/parts/inventory/stockStatus';

export interface InventoryToolbarProps {
  serviceId: number | null;
  status: string;
  /** The names for the service menu; `undefined` leaves the menu out. */
  services?: readonly NamedRef[];
  onService: (id: string) => void;
  onStatus: (status: string) => void;
  onClear: () => void;
  /** Reads the list again. */
  onRefresh: () => void;
  /** A read is running: the refresh icon turns. */
  busy?: boolean;
}

/** Service and status filters, and the refresh tool. */
export function InventoryToolbar({
  serviceId,
  status,
  services,
  onService,
  onStatus,
  onClear,
  onRefresh,
  busy = false,
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
    <>
      <LegendBox legend="Quick Search">
        {services && (
          <SelectField
            aria-label="Filter by service"
            selectWrapClassName="min-w-[14rem]"
            value={serviceId ?? ''}
            options={options}
            onChange={(event) => onService(event.target.value)}
          />
        )}
        <SelectField
          aria-label="Filter by status"
          selectWrapClassName="min-w-[12rem]"
          value={status}
          options={statusFilterOptions()}
          onChange={(event) => onStatus(event.target.value)}
        />
        {(serviceId !== null || status !== '') && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </LegendBox>
      <RefreshTool onRefresh={onRefresh} busy={busy} />
    </>
  );
}
