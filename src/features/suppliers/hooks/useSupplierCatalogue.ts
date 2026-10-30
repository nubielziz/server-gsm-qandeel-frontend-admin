// A supplier's own service list, one page at a time with a name search: the import dialog picks from it and the links editor
// picks the supplier service a new link points to. Kept while the page changes so the table does not flash empty.
import { keepPreviousData } from '@tanstack/react-query';
import type { Id } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { listSupplierServices } from '../api';
import { SUPPLIER_CATALOGUE_KEY } from './keys';

/** Which page of which supplier's service list to read. */
export type CatalogueArgs = {
  supplierId: Id | undefined;
  page: number;
  pageSize: number;
  /** Text to search the names for; empty lists everything. */
  q?: string;
  /** Only the services that no service of the console uses yet. */
  onlyNew?: boolean;
  enabled?: boolean;
};

/** `data` is the page of services with the `total` the server counted. */
export function useSupplierCatalogue({
  supplierId,
  page,
  pageSize,
  q = '',
  onlyNew = false,
  enabled = true,
}: CatalogueArgs) {
  return useApiQuery({
    queryKey: [...SUPPLIER_CATALOGUE_KEY, supplierId, { page, pageSize, q, onlyNew }],
    queryFn: ({ signal }) =>
      listSupplierServices(
        supplierId as Id,
        {
          start: (page - 1) * pageSize,
          end: page * pageSize,
          q,
          sort: ['name'],
          order: ['asc'],
          ...(onlyNew ? { filters: { imported: false } } : {}),
        },
        { signal },
      ),
    enabled: enabled && supplierId !== undefined,
    placeholderData: keepPreviousData,
  });
}
