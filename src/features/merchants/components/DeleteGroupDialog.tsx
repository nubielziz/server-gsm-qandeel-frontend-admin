// DeleteGroupDialog: "Delete <group>?" with a review step. A group that merchants are still in cannot be deleted; the server
// refuses it (409) and the dialog shows why.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteGroup } from '../hooks/useClientGroups';
import type { ClientGroup } from '../types';

/** Asks before deleting a group; the server refuses a group that still has merchants. */
export function DeleteGroupDialog({ group, onClose }: { group: ClientGroup; onClose: () => void }) {
  const remove = useDeleteGroup();
  return (
    <ConfirmDialog
      open
      title={`Delete ${group.name}?`}
      body={
        <p>
          The group is removed for good. Only a group with no merchants can be deleted, so nobody loses their
          prices.
        </p>
      }
      confirm="Delete group"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(group).then(() => undefined)}
    />
  );
}
