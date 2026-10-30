// The notification templates: the list for the Customer emails tab (by audience and channel), the changes (add, edit, the "Send" switch,
// delete) and the server's preview. Dialogs show their own failures; a failed switch shows the server's words as a toast.
import { useList, type CrudFilters } from '@refinedev/core';
import { useApiMutation, useApiQuery } from '@/lib/query';
import { createTemplate, deleteTemplate, previewTemplate, updateTemplate } from '../api';
import { eventLabel } from '../lib/templates';
import type {
  CreateTemplateBody,
  NotificationTemplate,
  PreviewTemplateBody,
  UpdateTemplateBody,
} from '../types';
import { PREVIEW_KEY, WHOLE_LIST } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** The templates that match the menus above the table (an empty text means all). Needs `notifications:read`. */
export function useTemplateList(filters: { audience: string; channel: string }, enabled = true) {
  const crud: CrudFilters = [];
  if (filters.audience) crud.push({ field: 'audience', operator: 'eq', value: filters.audience });
  if (filters.channel) crud.push({ field: 'channel', operator: 'eq', value: filters.channel });
  const { result, query } = useList<NotificationTemplate>({
    resource: 'notification-templates',
    pagination: { currentPage: 1, pageSize: WHOLE_LIST },
    sorters: [{ field: 'event', order: 'asc' }],
    filters: crud,
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { templates: result.data, query };
}

/** Adds a template. Needs `notifications:create`. */
export function useCreateTemplate() {
  return useApiMutation({
    mutationFn: (body: CreateTemplateBody) => createTemplate(body),
    invalidates: [{ resource: 'notification-templates' }],
    successNotification: (template) => ({ message: `${eventLabel(template.event)} added` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a template. Needs `notifications:update`. */
export function useUpdateTemplate() {
  return useApiMutation({
    mutationFn: ({ template, body }: { template: NotificationTemplate; body: UpdateTemplateBody }) =>
      updateTemplate(template.id, body),
    invalidates: (_result, { template }) => [{ resource: 'notification-templates', id: template.id }],
    invalidateKeys: [[...PREVIEW_KEY]],
    successNotification: (template) => ({ message: `${eventLabel(template.event)} saved` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** The "Send" switch of a row (`st-nt` in the demo). A refusal shows as the default error toast. */
export function useToggleTemplate() {
  return useApiMutation({
    mutationFn: ({ template, on }: { template: NotificationTemplate; on: boolean }) =>
      updateTemplate(template.id, { isActive: on }),
    invalidates: (_result, { template }) => [{ resource: 'notification-templates', id: template.id }],
    successNotification: (template, { on }) => ({
      message: `${eventLabel(template.event)} is ${on ? 'on' : 'off'}`,
    }),
  });
}

/** Deletes a template. Needs `notifications:delete`. */
export function useDeleteTemplate() {
  return useApiMutation({
    mutationFn: (template: NotificationTemplate) => deleteTemplate(template.id),
    invalidates: (_result, template) => [{ resource: 'notification-templates', id: template.id }],
    successNotification: (_result, template) => ({ message: `${eventLabel(template.event)} deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * The server's rendering of a template with sample data. It is asked again each time the dialog opens, so a template that was just
 * edited shows its new text. Pass `body` to preview text that is not saved yet.
 */
export function useTemplatePreview(id: number, body: PreviewTemplateBody = {}) {
  return useApiQuery({
    queryKey: [...PREVIEW_KEY, id, body.subject ?? null, body.body ?? null],
    queryFn: ({ signal }) => previewTemplate(id, body, { signal }),
    staleTime: 0,
    gcTime: 0,
  });
}
