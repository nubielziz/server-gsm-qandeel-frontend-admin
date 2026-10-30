// The reply templates: the whole list as a Refine list (it is short, and the composer's picker and the manage view both need
// all of it), and the create, edit and delete actions of the manage view.
import { useList } from '@refinedev/core';
import { useApiMutation } from '@/lib/query';
import { createReplyTemplate, deleteReplyTemplate, updateReplyTemplate } from '../api';
import type { CreateTemplateBody, ReplyTemplate, UpdateTemplateBody } from '../types';

/** Most templates the console loads. If the server has more, the manage view says so. */
export const TEMPLATE_CAP = 200;

/** `templates` is the loaded list by title, `total` what the server counted; `query` carries loading, error and refetch. */
export function useTemplates(options: { enabled?: boolean } = {}) {
  const { result, query } = useList<ReplyTemplate>({
    resource: 'reply-templates',
    pagination: { currentPage: 1, pageSize: TEMPLATE_CAP },
    sorters: [{ field: 'title', order: 'asc' }],
    queryOptions: { enabled: options.enabled ?? true },
    // The view shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { templates: result.data, total: result.total, query };
}

const NO_ERROR_TOAST = () => false as const;
const staleTemplates = [{ resource: 'reply-templates' }];

/** Adds a template. The dialog shows a failure under its fields. */
export function useCreateTemplate() {
  return useApiMutation({
    mutationFn: (body: CreateTemplateBody) => createReplyTemplate(body),
    invalidates: staleTemplates,
    successNotification: (created) => ({ message: 'Template added', description: created.title }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the fields of a template that changed. */
export function useUpdateTemplate() {
  return useApiMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTemplateBody }) => updateReplyTemplate(id, body),
    invalidates: (_template, { id }) => [{ resource: 'reply-templates', id }],
    successNotification: (saved) => ({ message: 'Template saved', description: saved.title }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Deletes a template; the confirm dialog shows a failure itself. */
export function useDeleteTemplate() {
  return useApiMutation({
    mutationFn: (template: Pick<ReplyTemplate, 'id' | 'title'>) => deleteReplyTemplate(template.id),
    invalidates: staleTemplates,
    successNotification: (_none, template) => ({ message: 'Template deleted', description: template.title }),
    errorNotification: NO_ERROR_TOAST,
  });
}
