// The code inventory (a Refine list) and its two actions: import codes for a service and void unsold codes. Both make the list
// stale. The dialogs show a failed call themselves; the import dialog also shows the server's counts.
import { useList } from '@refinedev/core';
import type { CrudFilters } from '@refinedev/core';
import { useApiMutation } from '@/lib/query';
import { importInventoryCodes, voidInventoryCodes } from '../api';
import type { ImportCodesBody, InventoryCode, InventoryFilters } from '../types';

const NO_ERROR_TOAST = () => false as const;

/** What `useInventoryList` asks the server for. */
export type InventoryListArgs = {
  filters: InventoryFilters;
  page: number;
  pageSize: number;
  enabled?: boolean;
};

/** One page of codes, newest first. `total` is what the server counted for the whole filter. */
export function useInventoryList({ filters, page, pageSize, enabled = true }: InventoryListArgs) {
  const crudFilters: CrudFilters = [];
  if (filters.serviceId !== undefined)
    crudFilters.push({ field: 'serviceId', operator: 'eq', value: filters.serviceId });
  if (filters.status) crudFilters.push({ field: 'status', operator: 'eq', value: filters.status });
  const { result, query } = useList<InventoryCode>({
    resource: 'inventory-codes',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    filters: crudFilters,
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { codes: result.data, total: result.total, query };
}

/**
 * Adds the pasted codes to a service's stock. The dialog shows the server's counts. The codes are the call's variables, in plain
 * text, so the mutation is dropped from the cache as soon as the dialog lets go of it (`gcTime: 0`).
 */
export function useImportCodes() {
  return useApiMutation({
    mutationFn: ({ serviceId, body }: { serviceId: number; body: ImportCodesBody }) =>
      importInventoryCodes(serviceId, body),
    invalidates: [{ resource: 'inventory-codes' }],
    errorNotification: NO_ERROR_TOAST,
    gcTime: 0,
  });
}

/** Takes the ticked unsold codes out of stock. The confirm dialog shows a refusal. */
export function useVoidCodes() {
  return useApiMutation({
    mutationFn: (ids: number[]) => voidInventoryCodes({ ids }),
    invalidates: [{ resource: 'inventory-codes' }],
    successNotification: (result) => ({
      message: `${result.voided} ${result.voided === 1 ? 'code' : 'codes'} voided`,
      description:
        result.skipped > 0
          ? `${result.skipped} ${result.skipped === 1 ? 'was' : 'were'} not unsold and stayed as ${result.skipped === 1 ? 'it was' : 'they were'}.`
          : 'They can no longer be sold.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
