// RolesTab: the "Roles" tab, which the demo lacks and the map adds (`CRUD /admin/roles`, MISMATCHES M11): the roles with
// their permission counts, New role, Edit and Delete, and the read-only summary of what each role can do.
import { useState } from 'react';
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  Panel,
  QueryState,
  SkeletonTable,
  type DataTableColumn,
} from '@/components/ui';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useSortedRows } from '../hooks/useSortedRows';
import { usePermissionCatalog, useRoles } from '../hooks/useRoles';
import { areaNames } from '../lib/permissions';
import type { SortValues } from '../lib/sort';
import type { Role } from '../types';
import { DeleteRoleDialog } from './DeleteRoleDialog';
import { RoleDialog } from './RoleDialog';
import { RoleMatrix } from './RoleMatrix';

const SORT_VALUES: SortValues<Role> = {
  name: (role) => role.name.toLowerCase(),
  permissions: (role) => role.permissions.length,
  staff: (role) => role.staffCount ?? 0,
};

type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; role: Role };

/**
 * Lists the roles, with the summary table under them; owns the create, edit and delete dialogs.
 */
export function RolesTab() {
  const grants = useAccessGrants();
  const { roles, query } = useRoles();
  const catalog = usePermissionCatalog();
  const { rows, sort, setSort } = useSortedRows(roles, SORT_VALUES, { field: 'name', order: 'asc' });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('roles:create');
  const updateLock = grants.needs('roles:update');
  const deleteLock = grants.needs('roles:delete');

  const newButton = (large?: boolean) => (
    <Button
      variant="primary"
      size={large ? 'md' : 'sm'}
      disabled={createLock.disabled}
      title={createLock.title}
      onClick={() => setDialog({ kind: 'create' })}
    >
      <Icon name="plus" className="ic-sm" />
      New role
    </Button>
  );

  const columns: DataTableColumn<Role>[] = [
    {
      key: 'name',
      label: 'Role',
      sortField: 'name',
      render: (role) =>
        updateLock.disabled ? (
          <span className="font-medium">{role.name}</span>
        ) : (
          <button
            type="button"
            className="link font-medium"
            onClick={() => setDialog({ kind: 'edit', role })}
          >
            {role.name}
          </button>
        ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      sortField: 'permissions',
      render: (role) => (
        <>
          {role.permissions.includes('*') ? 'All' : role.permissions.length}
          {areaNames(role).length > 0 && (
            <p className="max-w-[28rem] truncate text-2xs text-ink3">{areaNames(role).join(', ')}</p>
          )}
        </>
      ),
    },
    {
      key: 'staff',
      label: 'Admins',
      sortField: 'staff',
      num: true,
      hide: 'sm',
      render: (role) => role.staffCount ?? <span className="text-ink3">–</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (role) => {
        const holders = role.staffCount ?? 0;
        const inUse = `${holders} ${holders === 1 ? 'admin still has' : 'admins still have'} this role. Give them another role first.`;
        return (
          <span className="flex justify-end gap-1.5">
            <Button
              size="sm"
              disabled={updateLock.disabled}
              title={updateLock.title}
              onClick={() => setDialog({ kind: 'edit', role })}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={deleteLock.disabled || holders > 0}
              title={deleteLock.title ?? (holders > 0 ? inUse : undefined)}
              onClick={() => setDialog({ kind: 'delete', role })}
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
      <Panel
        title="Roles"
        sub="A role is a list of permissions. Admins get the permissions of their role."
        right={newButton()}
      >
        <QueryState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorTitle="Could not load the roles"
          skeleton={<SkeletonTable cols={4} rows={4} />}
        >
          <DataTable
            caption="Roles"
            columns={columns}
            rows={rows}
            rowKey={(role) => role.id}
            sort={sort}
            onSortChange={setSort}
            empty={
              <EmptyState icon="shield" title="No roles yet" cta={newButton(true)}>
                Create a role, give it the permissions it needs, then give it to the admins who should have
                them.
              </EmptyState>
            }
          />
        </QueryState>
      </Panel>
      {query.isSuccess && roles.length > 0 && (
        <div className="mt-4">
          <RoleMatrix
            roles={roles}
            catalog={catalog.data}
            loading={catalog.isLoading}
            error={catalog.error}
            onRetry={() => void catalog.refetch()}
          />
        </div>
      )}

      {dialog?.kind === 'create' && <RoleDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <RoleDialog role={dialog.role} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteRoleDialog role={dialog.role} onClose={() => setDialog(null)} />}
    </>
  );
}
