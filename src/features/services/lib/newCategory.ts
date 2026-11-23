// Helpers of the "New category…" step in the service form: the body that creates the category and the words for a refusal.
// The step asks for a name only; everything else follows the Categories tab's defaults for a new category.
import { errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';
import type { CreateCategoryBody, ServiceCategory, ServiceType } from '../types';

/** The position after the last category, so a category made from the service form joins the end of the menu. */
export function nextCategorySort(categories: readonly Pick<ServiceCategory, 'sort'>[]): number {
  return categories.reduce((last, category) => Math.max(last, category.sort), -1) + 1;
}

/**
 * The body of `POST /admin/service-categories` for a category made from the service form: the name typed, the service's type,
 * every merchant group (an empty list), shown to merchants, and last in the menu. Staff change the rest on the Categories tab.
 */
export function newCategoryBody(
  name: string,
  type: ServiceType,
  categories: readonly Pick<ServiceCategory, 'sort'>[],
): CreateCategoryBody {
  return { name: name.trim(), type, allowedGroupIds: [], sort: nextCategorySort(categories), isActive: true };
}

/** The server's words for a refused category: the messages it put on fields first, else its detail. */
export function refusalText(error: unknown): string {
  if (isApiError(error)) {
    const lines = [...error.formErrors, ...Object.values(error.fieldErrors).flat()];
    if (lines.length > 0) return lines.join(' ');
  }
  return errorText(error);
}
