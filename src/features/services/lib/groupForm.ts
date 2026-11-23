// The form of a group (Add Group and Edit Group): what it holds, how a group fills it and how it becomes the body of a create or of a
// change. Pure, so each rule is a test row. The server decides everything else (a name that is taken, a rank that does not exist).
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import type { CreateCategoryBody, ServiceCategory, UpdateCategoryBody } from '../types';
import { sameIds } from './categories';

/** What the form holds. `allowedGroupIds` are the ranks that see the group; none means every rank. */
export type GroupValues = { name: string; isActive: boolean; allowedGroupIds: Id[] };

/** A new group starts active and visible to every rank. */
export const NEW_GROUP: GroupValues = { name: '', isActive: true, allowedGroupIds: [] };

/** The form as it starts for a group that exists. */
export function valuesOf(group: ServiceCategory): GroupValues {
  return { name: group.name, isActive: group.isActive, allowedGroupIds: [...group.allowedGroupIds] };
}

/**
 * The body of `POST /admin/service-categories` for a group of the kind on the strip. No position is sent: the server puts a new
 * group last.
 */
export function createBody(values: GroupValues, type: ServiceType): CreateCategoryBody {
  return {
    name: values.name.trim(),
    type,
    allowedGroupIds: values.allowedGroupIds,
    isActive: values.isActive,
  };
}

/** Only what differs from the group, for `PATCH /admin/service-categories/:id`; empty when nothing changed. */
export function changesOf(values: GroupValues, group: ServiceCategory): UpdateCategoryBody {
  const body: UpdateCategoryBody = {};
  const name = values.name.trim();
  if (name !== group.name) body.name = name;
  if (values.isActive !== group.isActive) body.isActive = values.isActive;
  if (!sameIds(values.allowedGroupIds, group.allowedGroupIds)) body.allowedGroupIds = values.allowedGroupIds;
  return body;
}
