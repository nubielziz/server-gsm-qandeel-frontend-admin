// The form of a group (Add Group and Edit Group): what it holds, how a group fills it and how it becomes the body of a create or of a
// change. Pure, so each rule is a test row. The server decides everything else (a name that is taken, a rank that does not exist).
import { ApiError, isApiError, type Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import type { CreateCategoryBody, ServiceCategory, UpdateCategoryBody } from '../types';
import { sameIds } from './categories';
import { kindLabel } from './productsNav';

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

/** The words for a name that is taken: the owner thinks in groups and in the kinds on the strip, not in the server's "category". */
export function duplicateNameText(type: ServiceType): string {
  return `A group with this name already exists in ${kindLabel(type)}.`;
}

/**
 * The server's error with its "name is taken" message in the console's words. The server answers 422 with a field error on `name` and the
 * code `duplicate` ("A file category with this name already exists."); the form shows "A group with this name already exists in File
 * Service." instead. Any other message, and an error without that code, stays as the server sent it.
 */
export function groupFormError(error: unknown, type: ServiceType): unknown {
  if (!isApiError(error)) return error;
  const messages = error.fieldErrors.name;
  const codes = error.fieldCodes.name;
  // The codes line up with the messages only when every entry on the field has one; otherwise the error is left alone.
  if (!messages || !codes || codes.length !== messages.length || !codes.includes('duplicate')) return error;
  const name = messages.map((message, at) => (codes[at] === 'duplicate' ? duplicateNameText(type) : message));
  return new ApiError({
    status: error.status,
    code: error.code,
    title: error.title,
    detail: error.detail,
    type: error.type,
    fieldErrors: { ...error.fieldErrors, name },
    fieldCodes: error.fieldCodes,
    formErrors: error.formErrors,
    requestId: error.requestId,
    retryAfter: error.retryAfter,
    cause: error.cause,
  });
}
