// AdminsTab: the "Admin accounts" tab (the demo's `tabAdmins`): figures, the accounts table with its "Add admin" button,
// the admin drawer and every account dialog. Loading, empty and error states come from the list's query.
import { useState } from 'react';
import { Button, EmptyState, Icon, Panel, QueryState, SkeletonStat, SkeletonTable } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useRoles } from '../hooks/useRoles';
import { LIST_CAP, useStaffList } from '../hooks/useStaffList';
import { AdminDrawer } from './AdminDrawer';
import { AdminStats } from './AdminStats';
import { AdminTable } from './AdminTable';
import type { StaffDialogState } from './staffDialogState';
import { StaffDialogs } from './StaffDialogs';

/**
 * Loads the accounts and the roles and owns which drawer and dialog are open; the parts it renders do the
 * drawing.
 */
export function AdminsTab() {
  const grants = useAccessGrants();
  const { staff, total, query } = useStaffList();
  const { roles } = useRoles({ enabled: grants.can('roles:read') });
  const now = useNow();
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<StaffDialogState | null>(null);
  const addLock = grants.needs('staff:create');
  const drawerRow = staff.find((member) => member.id === drawerId);

  const addButton = (
    <Button
      variant="primary"
      size="sm"
      disabled={addLock.disabled}
      title={addLock.title}
      onClick={() => setDialog({ kind: 'add' })}
    >
      <Icon name="plus" className="ic-sm" />
      Add admin
    </Button>
  );

  return (
    <>
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Could not load the admin accounts"
        skeleton={
          <>
            <SkeletonStat cells={4} />
            <Panel flush>
              <SkeletonTable cols={6} rows={6} />
            </Panel>
          </>
        }
      >
        <AdminStats staff={staff} />
        <Panel
          title="Admin accounts"
          sub="Everyone who can sign in to this console. Suspending keeps their history in the audit log."
          right={addButton}
        >
          {staff.length === 0 ? (
            <EmptyState icon="users" title="No admin accounts" cta={addButton}>
              Add the people who run the console. They get an invitation to choose a password.
            </EmptyState>
          ) : (
            <AdminTable
              staff={staff}
              meId={grants.me?.id}
              now={now}
              onOpen={(member) => setDrawerId(member.id)}
            />
          )}
        </Panel>
        {(total ?? 0) > staff.length && (
          <p className="mt-2 text-xs text-ink3">
            Showing the first {LIST_CAP} of {total} admin accounts.
          </p>
        )}
      </QueryState>

      {/* The drawer opens first and the dialogs after it, so a dialog opened from the drawer sits on top of it. */}
      {drawerRow && (
        <AdminDrawer
          row={drawerRow}
          staff={staff}
          roles={roles}
          now={now}
          onClose={() => setDrawerId(null)}
          onAction={setDialog}
        />
      )}
      <StaffDialogs
        dialog={dialog}
        staff={staff}
        roles={roles}
        meId={grants.me?.id}
        onChange={setDialog}
        onCreated={(created) => setDrawerId(created.id)}
      />
    </>
  );
}
