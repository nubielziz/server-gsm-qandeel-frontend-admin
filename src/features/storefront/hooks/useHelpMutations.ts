// The actions on help articles, each with the toast the demo showed and the reads it makes stale. Ports the toast of
// `help-toggle` in 50-p-storefront.js and adds the create and edit the map gives.
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { createHelpArticle, updateHelpArticle } from '../api';
import type { CreateArticleBody, HelpArticle, UpdateArticleBody } from '../types';
import { STOREFRONT_STALE_KEYS, staleResource } from './keys';

const NO_ERROR_TOAST = () => false as const;
const RESOURCE = 'help-articles';

/** The Publish and Unpublish button: there is no publish route for articles, so it changes `isPublished` with a PATCH. */
export function useSetArticlePublished() {
  return useApiMutation({
    mutationFn: ({ article, published }: { article: HelpArticle; published: boolean }) =>
      updateHelpArticle(article.id, { isPublished: published }),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (_updated, { article, published }) => {
      toast({
        kind: 'success',
        title: published ? 'Article published' : 'Article unpublished',
        body: article.question,
        ttl: 2400,
      });
    },
  });
}

/** Writes an article. The dialog shows a refusal under the field it names. */
export function useCreateArticle() {
  return useApiMutation({
    mutationFn: (body: CreateArticleBody) => createHelpArticle(body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (created) => {
      toast({ kind: 'success', title: 'Article saved', body: created.question, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of an article. */
export function useUpdateArticle() {
  return useApiMutation({
    mutationFn: ({ article, body }: { article: HelpArticle; body: UpdateArticleBody }) =>
      updateHelpArticle(article.id, body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (updated) => {
      toast({ kind: 'success', title: 'Article saved', body: updated.question, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}
