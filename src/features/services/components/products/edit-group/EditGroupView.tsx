// EditGroupView: the edit view of one group (`?view=edit-group&id=<id>`): the same label-left form as Add Group, filled with the group, with one
// "Save" button in the pinned bar. Only what changed is sent. The strip shows the kind of the group being edited. Needs catalog:read;
// saving needs catalog:update.
import { Navigate, useSearchParams } from 'react-router';
import { ButtonLink, EmptyState, ErrorState, Skeleton, toast } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useUpdateCategory } from '../../../hooks/useCategoryMutations';
import { useGroup } from '../../../hooks/useGroup';
import { changesOf, valuesOf } from '../../../lib/groupForm';
import { parseRecordId, productsPath } from '../../../lib/productsPath';
import { GroupForm } from '../groups/GroupForm';
import type { ProductsViewProps } from '../types';

const BACK = (type: ProductsViewProps['type']) => productsPath({ type, view: 'groups' });

// The group the address names.
function GroupEditor({ id, type, grants }: ProductsViewProps & { id: Id }) {
  const { group: read, query } = useGroup(id);
  const update = useUpdateCategory();
  // The app keeps the previous answer while the next one loads: the record of the group before this one is not this group's.
  const group = read?.id === id ? read : undefined;
  if (!group) {
    return query.isError ? (
      <ErrorState
        title="Could not load this group"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    ) : (
      <div role="status" className="flex flex-col gap-2">
        <span className="sr-only">Loading the group</span>
        <Skeleton width="40%" height={16} />
        <Skeleton />
        <Skeleton width="80%" />
      </div>
    );
  }
  // The strip shows the kind of the group being edited: an address that names another kind (or none) is corrected.
  if (group.type !== type) {
    return <Navigate to={productsPath({ view: 'edit-group', type: group.type, id })} replace />;
  }
  return (
    <GroupForm
      heading="Edit Service Group"
      submitLabel="Save"
      initial={valuesOf(group)}
      lock={grants.needs('catalog:update')}
      type={type}
      canRanks={grants.can('groups:read')}
      withoutRanks="The group keeps the ranks it has now."
      onSubmit={async (values) => {
        const body = changesOf(values, group);
        if (Object.keys(body).length === 0) {
          toast({ kind: 'info', title: 'Nothing changed' });
          return;
        }
        return valuesOf(await update.mutateAsync({ category: group, body }));
      }}
    />
  );
}

/** The editor of the group the address names, or a line saying none is named. */
export function EditGroupView({ type, grants }: ProductsViewProps) {
  const [params] = useSearchParams();
  const id = parseRecordId(params.get('id'));
  if (id === null) {
    return (
      <EmptyState
        icon="layers"
        title="No group chosen"
        cta={<ButtonLink to={BACK(type)}>Back to Group</ButtonLink>}
      >
        Open a group from the list to edit it.
      </EmptyState>
    );
  }
  return <GroupEditor key={id} id={id} type={type} grants={grants} />;
}
