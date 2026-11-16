// The two steps of the import dialog: look at what the picked services would do (Preview, changes nothing), then bring them in.
// Both send the list 500 ids at a time (the server takes no more per call) and go on where they stopped. A failed call shows in
// the dialog, so neither hook toasts an error.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import type { Id } from '@/lib/api';
import { num } from '@/lib/format';
import type { InvalidateTarget } from '@/lib/query';
import { importServices, previewImport } from '../api';
import { mergePreviews, mergeResults } from '../lib/importPlan';
import type { ImportPreview, ImportPreviewItem, ImportResult } from '../types';
import { staleSupplier, SUPPLIER_CATALOGUE_KEY, SUPPLIER_STALE_KEYS } from './keys';
import { useBatchedMutation } from './useBatchedMutation';

const NO_ERROR_TOAST = () => false as const;

/** What an import makes stale: this supplier's records, the Services page, and the reads behind the supplier page. */
const staleResources = (supplierId: Id): InvalidateTarget[] => [
  ...staleSupplier(supplierId),
  { resource: 'services' },
];
const STALE_KEYS = [SUPPLIER_CATALOGUE_KEY, ...SUPPLIER_STALE_KEYS];

/** Asks the server what an import of these supplier services would do, 500 at a time; the items of all calls come back as one list. */
export function usePreviewImport(supplierId: Id) {
  return useBatchedMutation<Id, ImportPreview, ImportPreviewItem[]>({
    send: (batch) => previewImport(supplierId, { supplierServiceIds: batch }),
    merge: mergePreviews,
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Imports the services, 500 at a time. One toast counts what the server did over all calls. The services page and this supplier's
 * table are made stale after the last call, or after a call that failed once some had gone through.
 */
export function useImportServices(supplierId: Id) {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useBatchedMutation<Id, ImportResult, ImportResult>({
    send: (batch) => importServices(supplierId, { supplierServiceIds: batch }),
    merge: mergeResults,
    invalidates: staleResources(supplierId),
    invalidateKeys: STALE_KEYS,
    onPartial: () => {
      for (const target of staleResources(supplierId)) {
        void invalidate({
          resource: target.resource,
          id: target.id,
          invalidates: ['list', 'many', 'detail'],
        });
      }
      for (const queryKey of STALE_KEYS) void queryClient.invalidateQueries({ queryKey });
    },
    successNotification: (result) => ({
      message: `${num(result.created + result.updated)} services imported`,
      description: [
        result.created > 0 && `${num(result.created)} new`,
        result.updated > 0 && `${num(result.updated)} updated`,
        result.unchanged > 0 && `${num(result.unchanged)} unchanged`,
      ]
        .filter(Boolean)
        .join(', '),
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
