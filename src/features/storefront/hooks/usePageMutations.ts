// The actions on content pages, each with the toast the demo showed and the reads it makes stale. Ports the toasts of the
// landing menu (`lp-menu`), `pg-toggle` and the generator the map adds. The publish toggles leave a failed call to the default
// error toast; the hooks used from a dialog leave it to that dialog.
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { createContentPage, generateContentPages, publishContentPage, updateContentPage } from '../api';
import type { ContentPage, CreatePageBody, GeneratePagesBody, UpdatePageBody } from '../types';
import { STOREFRONT_STALE_KEYS, staleResource } from './keys';

const NO_ERROR_TOAST = () => false as const;
const RESOURCE = 'content-pages';

/** Publishes a page, or hides it again. */
export function usePublishPage() {
  return useApiMutation({
    mutationFn: ({ page, published }: { page: ContentPage; published: boolean }) =>
      publishContentPage(page.id, { published }),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (_updated, { page, published }) => {
      toast({
        kind: 'success',
        title: published ? 'Page published' : 'Page unpublished',
        body: page.title,
        ttl: 2600,
      });
    },
  });
}

/** Creates a page (a draft). The dialog shows a refusal under the field it names. */
export function useCreatePage() {
  return useApiMutation({
    mutationFn: (body: CreatePageBody) => createContentPage(body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (created) => {
      toast({ kind: 'success', title: 'Page saved as a draft', body: created.title, ttl: 2800 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a page. */
export function useUpdatePage() {
  return useApiMutation({
    mutationFn: ({ page, body }: { page: ContentPage; body: UpdatePageBody }) =>
      updateContentPage(page.id, body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (updated) => {
      toast({ kind: 'success', title: 'Page saved', body: updated.title, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Runs the draft generator. The dialog shows the drafts it made (or a refusal). */
export function useGeneratePages() {
  return useApiMutation({
    mutationFn: (body: GeneratePagesBody) => generateContentPages(body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    errorNotification: NO_ERROR_TOAST,
  });
}
