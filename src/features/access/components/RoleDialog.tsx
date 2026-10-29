// RoleDialog: create or edit a role (a tab the demo lacks, built in its style; MISMATCHES M11): a name and the permissions
// from `GET /admin/permissions`, grouped by prefix. Only what changed is sent.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, QueryState, SkeletonTable, TextField, toast, dialogSubmit } from '@/components/ui';
import { useCreateRole, useUpdateRole } from '../hooks/useRoleMutations';
import { usePermissionCatalog } from '../hooks/useRoles';
import { sameMembers } from '../lib/permissions';
import type { Role, UpdateRoleBody } from '../types';
import { PermissionPicker } from './PermissionPicker';

export interface RoleDialogProps {
  /** The role to edit; leave out to create one. */
  role?: Role;
  onClose: () => void;
}

/**
 * Creates a role, or edits one when `role` is given. Only what changed is sent.
 */
export function RoleDialog({ role, onClose }: RoleDialogProps) {
  const catalog = usePermissionCatalog();
  const create = useCreateRole();
  const update = useUpdateRole();
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const form = useForm<{ name: string }>({ defaultValues: { name: role?.name ?? '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async ({ name }) => {
      const trimmed = name.trim();
      if (!role) {
        await create.mutateAsync({ name: trimmed, permissions });
        return;
      }
      const body: UpdateRoleBody = {};
      if (trimmed !== role.name) body.name = trimmed;
      if (!sameMembers(permissions, role.permissions)) body.permissions = permissions;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ role, body });
    },
    { fields: ['name'] },
  );

  const holders = role?.staffCount ?? 0;
  return (
    <FormDialog
      open
      size="lg"
      title={role ? `Edit ${role.name}` : 'New role'}
      sub="A role is a list of permissions. Admins get the permissions of their role."
      confirm={role ? 'Save changes' : 'Create role'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-4">
        <TextField
          label="Role name"
          maxLength={60}
          autoComplete="off"
          error={errors.name}
          {...register('name', { validate: (value) => value.trim() !== '' || 'Enter a role name.' })}
        />
        {holders > 0 && (
          <p className="text-xs text-ink3">
            {holders} {holders === 1 ? 'admin has' : 'admins have'} this role. A change applies to them at
            once.
          </p>
        )}
        <QueryState
          isLoading={catalog.isLoading}
          isError={catalog.isError}
          error={catalog.error}
          onRetry={() => void catalog.refetch()}
          errorTitle="Could not load the permissions"
          skeleton={<SkeletonTable cols={2} rows={4} />}
        >
          <PermissionPicker catalog={catalog.data ?? []} value={permissions} onChange={setPermissions} />
        </QueryState>
      </div>
    </FormDialog>
  );
}
