// GroupsView: the "Group" view of the Product / Services page: the groups (service categories) of the kind on the strip, as a dense list with a
// square for the status, up and down buttons for the order, the ranks that see each group and a square-pen link to its edit view. Under it the
// "With selected" strip (Activate, Deactivate, Delete) and the footer pager. Page and size live in the address. Needs catalog:read.
import { useMemo, useState } from 'react';
import {
  ButtonLink,
  DataTable,
  EmptyState,
  FooterPager,
  usePageClamp,
  useRowSelection,
} from '@/components/ui';
import { useCategories, useGroupOptions } from '../../../hooks/useChoices';
import { useMoveGroup, useSetGroupActive } from '../../../hooks/useGroupActions';
import { useGroupsAddress } from '../../../hooks/useGroupsAddress';
import { groupsOfKind, moveChanges, pageOf } from '../../../lib/groupList';
import { productsPath } from '../../../lib/productsPath';
import type { ProductsViewProps } from '../types';
import { GroupBulkBar } from './GroupBulkBar';
import { groupColumns } from './groupColumns';

/** The groups of the kind on the strip. */
export function GroupsView({ type, grants }: ProductsViewProps) {
  const { categories, total, query } = useCategories();
  const ranks = useGroupOptions(grants.can('groups:read'));
  const address = useGroupsAddress(type);
  const selection = useRowSelection<number>();
  const setActive = useSetGroupActive();
  const move = useMoveGroup();
  const [announcement, setAnnouncement] = useState('');

  const ordered = useMemo(() => groupsOfKind(categories, type), [categories, type]);
  const { rows, page } = pageOf(ordered, address.page, address.size);
  usePageClamp({
    page: address.page,
    pageSize: address.size,
    total: ordered.length,
    settled: query.isSuccess && !query.isFetching,
    setPage: address.clampPage,
  });

  const columns = groupColumns({
    type,
    ordered,
    ranks: ranks.data,
    updateLock: grants.needs('catalog:update'),
    busyId: setActive.isPending ? (setActive.variables?.group.id ?? null) : null,
    onToggle: (group) => setActive.mutate({ group, isActive: !group.isActive }),
    onMove: (group, direction) => {
      if (move.isPending) return;
      const changes = moveChanges(ordered, group.id, direction);
      if (changes.length === 0) return;
      move.mutate({ changes }, { onSuccess: () => setAnnouncement(`${group.name} moved ${direction}`) });
    },
  });

  // A tick belongs to the page it was made on: a new page or size starts with none, so "Delete" never reaches a group out of sight.
  const toPage = (next: number) => {
    selection.clear();
    address.setPage(next);
  };
  const toSize = (next: number) => {
    selection.clear();
    address.setSize(next);
  };

  return (
    <div className="view-frame">
      <div>
        <DataTable
          skin="list"
          footer={false}
          caption="Service groups"
          columns={columns}
          rows={rows}
          rowKey={(group) => group.id}
          selection={selection}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          errorTitle="Could not load the groups"
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState
              icon="layers"
              title="No groups in this kind yet"
              cta={
                grants.can('catalog:create') ? (
                  <ButtonLink to={productsPath({ type, view: 'add-group' })}>Add a group</ButtonLink>
                ) : undefined
              }
            >
              Groups hold the services merchants browse. Add a group, then put services in it.
            </EmptyState>
          }
        />
        {rows.length > 0 && (
          <GroupBulkBar
            selected={rows.filter((group) => selection.has(group.id))}
            onCheckAll={() =>
              selection.setMany(
                rows.map((group) => group.id),
                true,
              )
            }
            onUncheckAll={selection.clear}
            onDone={selection.clear}
            grants={grants}
          />
        )}
        {total !== undefined && total > categories.length && (
          <p className="px-3.5 py-2 text-xs text-ink3">
            Only the first {categories.length} of {total} groups are listed.
          </p>
        )}
        <p className="sr-only" role="status">
          {announcement}
        </p>
      </div>
      <FooterPager
        page={page}
        pageSize={address.size}
        total={ordered.length}
        onPage={toPage}
        onPageSize={toSize}
      />
    </div>
  );
}
