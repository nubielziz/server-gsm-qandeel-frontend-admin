// The actions on legal documents, each with the toast the demo showed and the reads it makes stale. Ports the toast of
// `lg-publish` in 50-p-storefront.js. The map splits the demo's one step in two: write a version, then publish it.
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { createLegalDocument, publishLegalDocument } from '../api';
import { legalTypeLabel } from '../lib/legal';
import type { CreateLegalBody, LegalDocument } from '../types';
import { STOREFRONT_STALE_KEYS, staleResource } from './keys';

const NO_ERROR_TOAST = () => false as const;
const RESOURCE = 'legal-documents';

/** Writes a new version. It is not in force until it is published. */
export function useCreateLegal() {
  return useApiMutation({
    mutationFn: (body: CreateLegalBody) => createLegalDocument(body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (created) => {
      toast({
        kind: 'success',
        title: `${legalTypeLabel(created.type)} v${created.version} saved`,
        body: 'It is not in force yet. Publish it when it is ready.',
        ttl: 3200,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Publishes a version: the confirm dialog shows a refusal in its error slot. */
export function usePublishLegal() {
  return useApiMutation({
    mutationFn: (document: LegalDocument) => publishLegalDocument(document.id),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (published) => {
      toast({
        kind: 'success',
        title: `${legalTypeLabel(published.type)} updated`,
        body: `Version ${published.version} is now in force.`,
        ttl: 2800,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}
