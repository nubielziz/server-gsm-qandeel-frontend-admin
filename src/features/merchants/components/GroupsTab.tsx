// GroupsTab: the "Groups" tab, which the demo lacks and the map adds (`CRUD /admin/client-groups`, MISMATCHES M46): each price group
// with its discount, upgrade threshold, deposit limit and merchants, plus New group, Edit and Delete. It fills the page's panel
// under the tab strip, so it draws a header row instead of a panel of its own (panels are never nested).
import { useState } from 'react';
import { Link } from 'react-router';
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  QueryState,
  SkeletonTable,
  TypeTag,
  type DataTableColumn,
} from '@/components/ui';
import { money0 } from '@/lib/format';
import { useClientGroups } from '../hooks/useClientGroups';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { isRetailGroup, percentText } from '../lib/groups';
import { merchantsListPath } from '../lib/paths';
import type { ClientGroup } from '../types';
import { DeleteGroupDialog } from './DeleteGroupDialog';
import { GroupDialog } from './GroupDialog';

type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; group: ClientGroup };

/** Lists the groups; owns the create, edit and delete dialogs. */
export function GroupsTab({ grants }: { grants: MerchantGrants }) {
  const { groups, query } = useClientGroups();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('groups:create');
  const updateLock = grants.needs('groups:update');
  const deleteLock = grants.needs('groups:delete');

  const newButton = (large?: boolean) => (
    <Button
      variant="primary"
      size={large ? 'md' : 'sm'}
      disabled={createLock.disabled}
      title={createLock.title}
      onClick={() => setDialog({ kind: 'create' })}
    >
      <Icon name="plus" className="ic-sm" />
      New group
    </Button>
  );

  const columns: DataTableColumn<ClientGroup>[] = [
    {
      key: 'name',
      label: 'Group',
      render: (group) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{group.name}</span>
          {group.isDefault && <TypeTag>Default</TypeTag>}
          {isRetailGroup(group) && <TypeTag>Storefront retail</TypeTag>}
        </span>
      ),
    },
    { key: 'discount', label: 'Discount', num: true, render: (group) => percentText(group.discountPercent) },
    {
      key: 'threshold',
      label: 'Upgrade threshold',
      num: true,
      hide: 'sm',
      render: (group) => money0(group.earnThreshold),
    },
    {
      key: 'deposit',
      label: 'Deposit limit',
      num: true,
      hide: 'md',
      render: (group) => money0(group.depositLimit),
    },
    {
      key: 'overdraft',
      label: 'Credit',
      hide: 'lg',
      render: (group) =>
        group.overdraftAllowed ? 'Allowed' : <span className="text-ink3">Not allowed</span>,
    },
    {
      key: 'merchants',
      label: 'Merchants',
      num: true,
      render: (group) =>
        group.merchantCount === undefined || isRetailGroup(group) ? (
          <span className="text-ink3">–</span>
        ) : group.merchantCount > 0 ? (
          <Link className="link" to={merchantsListPath({ group: group.id })}>
            {group.merchantCount}
          </Link>
        ) : (
          0
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (group) => {
        const inUse = (group.merchantCount ?? 0) > 0;
        return (
          <span className="flex justify-end gap-1.5">
            <Button
              size="sm"
              aria-label={`Edit ${group.name}`}
              disabled={updateLock.disabled}
              title={updateLock.title}
              onClick={() => setDialog({ kind: 'edit', group })}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              aria-label={`Delete ${group.name}`}
              disabled={deleteLock.disabled || inUse}
              title={deleteLock.title ?? (inUse ? 'Move its merchants to another group first.' : undefined)}
              onClick={() => setDialog({ kind: 'delete', group })}
            >
              Delete
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <div className="panel-h">
        <div className="min-w-[13rem] flex-1">
          <h2 className="panel-t">Merchant groups</h2>
          <p className="panel-s">
            A group sets the discount, the upgrade threshold and the deposit limit its merchants get.
          </p>
        </div>
        {newButton()}
      </div>
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Could not load the groups"
        skeleton={<SkeletonTable cols={5} rows={4} />}
      >
        <DataTable
          caption="Merchant groups"
          columns={columns}
          rows={groups}
          rowKey={(group) => group.id}
          empty={
            <EmptyState icon="tag" title="No groups yet" cta={newButton(true)}>
              A group gives its merchants a discount off base prices. Create one, then move merchants into it
              from their page.
            </EmptyState>
          }
        />
      </QueryState>

      {dialog?.kind === 'create' && <GroupDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <GroupDialog group={dialog.group} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && (
        <DeleteGroupDialog group={dialog.group} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
