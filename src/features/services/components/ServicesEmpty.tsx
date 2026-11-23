// ServicesEmpty: what the Catalog table says when there are no rows: no services at all, none in the chosen list, or none that match the
// filters. Ports the `empty` of servicesTab in 43-p-services.js; "Import from supplier" opens the Suppliers page, which imports services.
import { Button, ButtonLink, EmptyState, Icon } from '@/components/ui';
import { SUPPLIERS_PATH } from '../lib/paths';

export interface ServicesEmptyProps {
  /** No service exists at all (no chip, no filter, and the list is empty). */
  noServices: boolean;
  /** A toolbar filter is on: clearing it may bring rows back. */
  filtersOn: boolean;
  onClear: () => void;
  /** Goes back to the list of every service (a chip is on and nothing in it). */
  onAll: () => void;
}

/** Picks the empty state that is true: no services at all, an empty list, or none that match. */
export function ServicesEmpty({ noServices, filtersOn, onClear, onAll }: ServicesEmptyProps) {
  if (noServices) {
    return (
      <EmptyState
        icon="tag"
        title="No services yet"
        cta={
          <ButtonLink variant="primary" to={SUPPLIERS_PATH}>
            <Icon name="download" className="ic-sm" />
            Import from supplier
          </ButtonLink>
        }
      >
        Import services from a connected supplier, then set your prices. Each service gets a cost, a floor and
        a margin.
      </EmptyState>
    );
  }
  if (!filtersOn) {
    return (
      <EmptyState
        icon="checkCircle"
        title="Nothing in this list"
        cta={<Button onClick={onAll}>Show all services</Button>}
      >
        No service is in this list right now.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="filter"
      title="No services match"
      cta={<Button onClick={onClear}>Clear filters</Button>}
    >
      Try another search or remove a filter.
    </EmptyState>
  );
}
