// ServicesEmpty: what the table says when there are no rows: no services at all, or none that match the filters. Ports the
// `empty` of servicesTab in 43-p-services.js; "Import from supplier" opens the Suppliers page, which imports services.
import { Button, ButtonLink, EmptyState, Icon } from '@/components/ui';
import { SUPPLIERS_PATH } from '../lib/paths';

export interface ServicesEmptyProps {
  /** No service exists at all (no filter is on and the list is empty). */
  noServices: boolean;
  onClear: () => void;
}

/** Picks the empty state that is true: no services at all, or none that match. */
export function ServicesEmpty({ noServices, onClear }: ServicesEmptyProps) {
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
