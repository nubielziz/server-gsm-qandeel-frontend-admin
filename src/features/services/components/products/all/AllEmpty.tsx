// AllEmpty: what the All view says when the list has no rows: no service in the kind at all (with a way to add one), or none that match
// the search and the filters (with a way back to the whole list).
import { ButtonLink, EmptyState } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import { productsPath } from '../../../lib/productsPath';
import { allLink } from './allAddress';

export interface AllEmptyProps {
  type: ServiceType;
  /** A search or a filter is on: clearing it may bring rows back. */
  filtered: boolean;
  /** The role may add a service (`catalog:create`): the link to +Add Service is offered. */
  canAdd: boolean;
}

/** Picks the empty state that is true. */
export function AllEmpty({ type, filtered, canAdd }: AllEmptyProps) {
  if (filtered) {
    return (
      <EmptyState
        icon="filter"
        title="No services match"
        cta={<ButtonLink to={allLink(type)}>Clear the search</ButtonLink>}
      >
        Try another search or remove a filter.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="tag"
      title="No services in this kind yet"
      cta={
        canAdd ? (
          <ButtonLink variant="primary" to={productsPath({ view: 'add', type })}>
            +Add Service
          </ButtonLink>
        ) : undefined
      }
    >
      {canAdd ? 'Add one by hand or from a connected supplier.' : 'Ask an owner to add one.'}
    </EmptyState>
  );
}
