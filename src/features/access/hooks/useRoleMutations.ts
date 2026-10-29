// Creating, editing and deleting roles. A role change also refreshes the staff lists, which show role names, and the
// dialogs show a failed call themselves.
import { useApiMutation } from '@/lib/query';
import { createRole, deleteRole, updateRole } from '../api';
import type { CreateRoleBody, Role, UpdateRoleBody } from '../types';

const NO_ERROR_TOAST = () => false as const;

/**
 * Creates a role.
 */
export function useCreateRole() {
  return useApiMutation({
    mutationFn: (body: CreateRoleBody) => createRole(body),
    invalidates: [{ resource: 'roles' }],
    successNotification: (role) => ({
      message: `${role.name} role created`,
      description: `${role.permissions.length} ${role.permissions.length === 1 ? 'permission' : 'permissions'}.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a role. */
export function useUpdateRole() {
  return useApiMutation({
    mutationFn: ({ role, body }: { role: Role; body: UpdateRoleBody }) => updateRole(role.id, body),
    invalidates: (_updated, { role }) => [{ resource: 'roles', id: role.id }, { resource: 'staff' }],
    successNotification: (_updated, { role, body }) => ({
      message: `${body.name ?? role.name} role updated`,
      description: 'The change applies to everyone who has this role.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Deletes a role nobody holds. */
export function useDeleteRole() {
  return useApiMutation({
    mutationFn: (role: Role) => deleteRole(role.id),
    invalidates: (_result, role) => [{ resource: 'roles', id: role.id }, { resource: 'staff' }],
    successNotification: (_result, role) => ({ message: `${role.name} role deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
