// The two steps of the import dialog: look at what the picked services would do (Preview, changes nothing), then bring them in.
// A failed call shows in the dialog, so neither hook toasts an error.
import type { Id } from '@/lib/api';
import { useApiMutation } from '@/lib/query';
import { importServices, previewImport } from '../api';
import type { ImportBody } from '../types';
import { staleSupplier, SUPPLIER_CATALOGUE_KEY, SUPPLIER_STALE_KEYS } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Asks the server what an import of these supplier services would do. */
export function usePreviewImport(supplierId: Id) {
  return useApiMutation({
    mutationFn: (body: ImportBody) => previewImport(supplierId, body),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Imports the services; the toast counts what the server did. The services page and this supplier's table are made stale. */
export function useImportServices(supplierId: Id) {
  return useApiMutation({
    mutationFn: (body: ImportBody) => importServices(supplierId, body),
    invalidates: [...staleSupplier(supplierId), { resource: 'services' }],
    invalidateKeys: [SUPPLIER_CATALOGUE_KEY, ...SUPPLIER_STALE_KEYS],
    successNotification: (result) => ({
      message: `${result.created + result.updated} services imported`,
      description: [
        result.created > 0 && `${result.created} new`,
        result.updated > 0 && `${result.updated} updated`,
        result.unchanged > 0 && `${result.unchanged} unchanged`,
      ]
        .filter(Boolean)
        .join(', '),
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
