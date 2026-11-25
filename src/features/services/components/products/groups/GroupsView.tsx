// GroupsView: the "Group" view of the Product / Services page: the groups (service categories) of the kind on the strip, as a dense list with a
// Quick Search box (by name), a square for the status, up and down buttons for the order, the ranks that see each group and a square-pen link
// to its edit view. Under it the "With selected" strip (Activate, Deactivate, Delete) and the footer pager. Page, size and search live in the
// address. Needs catalog:read.
import { useMemo, useState } from 'react';
import { DataTable, FooterPager, Icon, usePageClamp, useRowSelection } from '@/components/ui';
import { useAddedGroup } from '../../../hooks/useAddedGroup';
import { useCategories, useGroupOptions } from '../../../hooks/useChoices';
import { useMoveGroup, useSetGroupActive } from '../../../hooks/useGroupActions';
import { useGroupsAddress } from '../../../hooks/useGroupsAddress';
import { groupsMatching, groupsOfKind, moveChanges, pageOf } from '../../../lib/groupList';
import type { ProductsViewProps } from '../types';
import { GroupBulkBar } from './GroupBulkBar';
import { groupColumns } from './groupColumns';
import { GroupSearch } from './GroupSearch';
import { GroupsEmpty } from './GroupsEmpty';

/** The groups of the kind on the strip. */
export function GroupsView({ type, grants }: ProductsViewProps) {
  const { categories, total, query } = useCategories();
  const ranks = useGroupOptions(grants.can('groups:read'));
  const address = useGroupsAddress(type);
  const selection = useRowSelection<number>();
  const setActive = useSetGroupActive();
  const move = useMoveGroup();
  const [announcement, setAnnouncement] = useState('');

  // `ordered` is the whole kind in the order merchants see; `shown` is what the search leaves of it. A move is always worked out on
  // `ordered` (a swap of two neighbours in the search would not be neighbours in the shop).
  const ordered = useMemo(() => groupsOfKind(categories, type), [categories, type]);
  const shown = useMemo(() => groupsMatching(ordered, address.q), [ordered, address.q]);
  const { rows, page } = pageOf(shown, address.page, address.size);
  const settled = query.isSuccess && !query.isFetching;
  usePageClamp({
    page: address.page,
    pageSize: address.size,
    total: shown.length,
    settled,
    setPage: address.clampPage,
  });
  const added = useAddedGroup(address, ordered, settled);

  const searching = address.q !== '';
  const columns = groupColumns({
    type,
    ordered,
    ranks: ranks.data,
    updateLock: grants.needs('catalog:update'),
    busyId: setActive.isPending ? (setActive.variables?.group.id ?? null) : null,
    markedId: added?.id ?? null,
    searching,
    onToggle: (group) => setActive.mutate({ group, isActive: !group.isActive }),
    onMove: (group, direction) => {
      if (move.isPending) return;
      const changes = moveChanges(ordered, group.id, direction);
      if (changes.length === 0) return;
      move.mutate({ changes }, { onSuccess: () => setAnnouncement(`${group.name} moved ${direction}`) });
    },
  });

  // A tick belongs to the page it was made on: a new page, size or search starts with none, so "Delete" never reaches a group out of sight.
  const toPage = (next: number) => {
    selection.clear();
    address.setPage(next);
  };
  const toSize = (next: number) => {
    selection.clear();
    address.setSize(next);
  };
  const toSearch = (text: string) => {
    selection.clear();
    address.search(text);
  };

  return (
    <div className="view-frame">
      <div>
        <GroupSearch q={address.q} onSearch={toSearch} />
        {total !== undefined && total > categories.length && (
          <p className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-warn-fg">
            <Icon name="alert" className="ic-sm flex-none" />
            Only the first {categories.length} of {total} groups are listed.
          </p>
        )}
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
            <GroupsEmpty
              type={type}
              searching={searching && ordered.length > 0}
              canAdd={grants.can('catalog:create')}
              onClear={() => toSearch('')}
            />
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
        <p className="sr-only" role="status">
          {added ? `Added ${added.name}` : announcement}
        </p>
      </div>
      <FooterPager
        page={page}
        pageSize={address.size}
        total={shown.length}
        onPage={toPage}
        onPageSize={toSize}
      />
    </div>
  );
}
