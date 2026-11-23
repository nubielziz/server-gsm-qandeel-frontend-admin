// Creating and editing service categories (a delete is a bulk action of the Group view: hooks/useGroupActions.ts). A category change also
// refreshes the service lists, which show category names (and a switched-off category keeps its services off the shop), and the service menus.
// The Add Group and Edit Group forms show a failed call themselves (a name that is taken, a rank that does not exist).
import { SERVICE_ROWS_KEY, useApiMutation } from '@/lib/query';
import { createCategory, updateCategory } from '../api';
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
    invalidateKeys: [SERVICE_PICKER_KEY, SERVICE_ROWS_KEY],
    successNotification: (category) => ({ message: `${category.name} updated` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
