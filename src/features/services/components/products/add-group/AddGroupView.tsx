// AddGroupView: the "+Add Group" view: a label-left form (Group Name, Active, Visible to) with one "Add" button in the pinned bar. The group is
// made in the kind on the strip and goes last; after it the list of groups opens on the page that holds the new group (the address carries its
// id), or +Add Service when the view was opened from its "Add New Group" link (the address says so), with the new group chosen. Needs
// catalog:read and catalog:create.
import { useNavigate, useSearchParams } from 'react-router';
import { useCreateCategory } from '../../../hooks/useCategoryMutations';
import { createBody, NEW_GROUP } from '../../../lib/groupForm';
import { productsPath } from '../../../lib/productsPath';
import { chooseDraftGroup, RETURN_KEY, RETURN_TO_ADD } from '../add/groupHandoff';
import { GroupForm } from '../groups/GroupForm';
import type { ProductsViewProps } from '../types';

/**
 * The form that adds a group of the kind on the strip. Opened from +Add Service (`return=add`), it hands the new group to that form's draft
 * and goes back to it, so the person finds what they typed with the new group chosen.
 */
export function AddGroupView({ type, grants }: ProductsViewProps) {
  const create = useCreateCategory();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const backToAdd = params.get(RETURN_KEY) === RETURN_TO_ADD;
  return (
    <GroupForm
      heading="Add Service Group"
      submitLabel="Add"
      initial={NEW_GROUP}
      lock={grants.needs('catalog:create')}
      type={type}
      canRanks={grants.can('groups:read')}
      withoutRanks="A new group is visible to every rank."
      onSubmit={async (values) => {
        const group = await create.mutateAsync(createBody(values, type));
        if (backToAdd) {
          chooseDraftGroup(type, group.id);
          void navigate(productsPath({ type, view: 'add' }));
        } else {
          // The new group is last, so on a long list it is on the last page: the Group view reads `group` and opens that page.
          void navigate(productsPath({ type, view: 'groups', group: group.id }));
        }
      }}
    />
  );
}
