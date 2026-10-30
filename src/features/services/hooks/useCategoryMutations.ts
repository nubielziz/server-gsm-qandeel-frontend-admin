// Creating, editing and deleting service categories. A category change also refreshes the service lists, which show category
// names, and the service menus. The dialogs show a failed call themselves (for example a category that services still use).
import { useApiMutation } from '@/lib/query';
import { createCategory, deleteCategory, updateCategory } from '../api';
import type { CreateCategoryBody, ServiceCategory, UpdateCategoryBody } from '../types';
import { SERVICE_PICKER_KEY } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Creates a category. */
export function useCreateCategory() {
  return useApiMutation({
    mutationFn: (body: CreateCategoryBody) => createCategory(body),
    invalidates: [{ resource: 'service-categories' }],
    successNotification: (category) => ({ message: `${category.name} created` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a category. */
export function useUpdateCategory() {
  return useApiMutation({
    mutationFn: ({ category, body }: { category: ServiceCategory; body: UpdateCategoryBody }) =>
      updateCategory(category.id, body),
    invalidates: (_result, { category }) => [
      { resource: 'service-categories', id: category.id },
      { resource: 'services' },
    ],
    invalidateKeys: [SERVICE_PICKER_KEY],
    successNotification: (category) => ({ message: `${category.name} updated` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Deletes a category. The server refuses one that services still use. */
export function useDeleteCategory() {
  return useApiMutation({
    mutationFn: (category: ServiceCategory) => deleteCategory(category.id),
    invalidates: (_result, category) => [{ resource: 'service-categories', id: category.id }],
    successNotification: (_result, category) => ({ message: `${category.name} deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
