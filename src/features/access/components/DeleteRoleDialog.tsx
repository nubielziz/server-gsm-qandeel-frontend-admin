// DeleteRoleDialog: "Delete <role>?" with a review step. A role that admins still hold cannot be deleted; the server
// refuses it and the dialog shows why.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteRole } from '../hooks/useRoleMutations';
import type { Role } from '../types';

export function DeleteRoleDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const remove = useDeleteRole();
  return (
    <ConfirmDialog
      open
      title={`Delete ${role.name}?`}
      body={
        <p>
          The role is removed for good. Nobody loses access, because only a role nobody has can be deleted.
        </p>
      }
      confirm="Delete role"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(role).then(() => undefined)}
    />
  );
}
