// DeleteCategoryDialog: "Delete <category>?" with a review step. The server refuses a category that services still use; the dialog
// shows its message, so the admin knows to move those services first.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteCategory } from '../hooks/useCategoryMutations';
import type { ServiceCategory } from '../types';

/** The review step before a category is deleted. */
export function DeleteCategoryDialog({
  category,
  onClose,
}: {
  category: ServiceCategory;
  onClose: () => void;
}) {
  const remove = useDeleteCategory();
  return (
    <ConfirmDialog
      open
      title={`Delete ${category.name}?`}
      body={<p>The category is removed for good. A category that services still use cannot be deleted.</p>}
      confirm="Delete category"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(category).then(() => undefined)}
    />
  );
}
