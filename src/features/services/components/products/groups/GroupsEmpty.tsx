// GroupsEmpty: what the Group view says when the table has no rows: no group in the kind at all (with a way to add one), or none that match
// the search (with a way back to the whole list).
import { Button, ButtonLink, EmptyState } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import { productsPath } from '../../../lib/productsPath';

export interface GroupsEmptyProps {
  type: ServiceType;
  /** A search is on: clearing it may bring rows back. */
  searching: boolean;
  /** The role may add a group (`catalog:create`): the link to +Add Group is offered. */
  canAdd: boolean;
  onClear: () => void;
}

/** Picks the empty state that is true. */
export function GroupsEmpty({ type, searching, canAdd, onClear }: GroupsEmptyProps) {
  if (searching) {
    return (
      <EmptyState icon="filter" title="No groups match" cta={<Button onClick={onClear}>Clear search</Button>}>
        Try another name, or clear the search to see every group of this kind.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="layers"
      title="No groups in this kind yet"
      cta={
        canAdd ? (
          <ButtonLink to={productsPath({ type, view: 'add-group' })}>Add a group</ButtonLink>
        ) : undefined
      }
    >
      Groups hold the services merchants browse. Add a group, then put services in it.
    </EmptyState>
  );
}
