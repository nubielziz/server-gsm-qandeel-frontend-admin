// PricingEmpty: what the Pricing view says when the grid has no row: no service of the kind yet (with a way to add one) or none that matches the
// search or the group (with a way to clear them).
import { Button, ButtonLink, EmptyState } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import { productsPath } from '../../../lib/productsPath';

export interface PricingEmptyProps {
  type: ServiceType;
  /** A search or a group is on. */
  filtered: boolean;
  /** `catalog:create`: the way to add a service. */
  canAdd: boolean;
  onClear: () => void;
}

/** The empty state of the price grid. */
export function PricingEmpty({ type, filtered, canAdd, onClear }: PricingEmptyProps) {
  return (
    <EmptyState
      icon="search"
      title={filtered ? 'No services match' : 'No services in this kind yet'}
      cta={
        filtered ? (
          <Button onClick={onClear}>Clear the search</Button>
        ) : (
          canAdd && <ButtonLink to={productsPath({ type, view: 'add' })}>Add a service</ButtonLink>
        )
      }
    >
      {filtered
        ? 'Nothing in this kind has that name or group.'
        : 'A service you add shows here with its prices.'}
    </EmptyState>
  );
}
