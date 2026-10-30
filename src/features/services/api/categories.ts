// Service categories (`/admin/service-categories*`): the Categories tab the map adds to the demo's Services & pricing page.
// The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
import {
  apiDelete,
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { CreateCategoryBody, ServiceCategory, UpdateCategoryBody } from '../types';

/**
 * The service categories with the merchant groups that can see each one.
 * Assumed contract: rows may carry `serviceCount` (how many services the category holds).
 * @route GET /admin/service-categories
 */
export function listCategories(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<ServiceCategory>> {
  return apiList<ServiceCategory>('/admin/service-categories', query, undefined, init);
}

/**
 * One category.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/service-categories/:id
 */
export function getCategory(id: Id, init?: ApiInit): Promise<ServiceCategory> {
  return apiGet<ServiceCategory>(pathOf('/admin/service-categories/:id', { id }), undefined, init);
}

/**
 * Creates a category. An empty `allowedGroupIds` makes it visible to every group.
 * Assumed contract: body `{ name, type, allowedGroupIds, sort, isActive }`, answer the new category.
 * @route POST /admin/service-categories
 */
export function createCategory(body: CreateCategoryBody, init?: ApiInit): Promise<ServiceCategory> {
  return apiPost<ServiceCategory>('/admin/service-categories', body, init);
}

/**
 * Changes a category; only the fields that change are sent.
 * Assumed contract: body is any of the fields of `UpdateCategoryBody`, answer the updated category.
 * @route PATCH /admin/service-categories/:id
 */
export function updateCategory(id: Id, body: UpdateCategoryBody, init?: ApiInit): Promise<ServiceCategory> {
  return apiPatch<ServiceCategory>(pathOf('/admin/service-categories/:id', { id }), body, init);
}

/**
 * Deletes a category. The server refuses (409) a category that services still use, and the dialog shows its message.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/service-categories/:id
 */
export function deleteCategory(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/service-categories/:id', { id }), undefined, init);
}
