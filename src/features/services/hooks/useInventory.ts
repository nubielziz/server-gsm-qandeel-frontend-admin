// The code inventory (a Refine list) and its two actions: import codes for a service and void unsold codes. Both make the list
// stale, and the services too: a row carries `stockAvailable` (the All view's "Codes: N in stock", the editor's counts), so every
// service list, record and menu is read again. The dialogs show a failed call themselves; the import dialog also shows the server's counts.
import { useList } from '@refinedev/core';
import type { CrudFilters } from '@refinedev/core';
import { useApiMutation } from '@/lib/query';
import { importInventoryCodes, voidInventoryCodes } from '../api';
import type { ImportCodesBody, InventoryCode, InventoryFilters } from '../types';
import { SERVICE_STALE_KEYS, staleServices } from './keys';

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
 * text, so the mutation is dropped from the cache as soon as the dialog lets go of it (`gcTime: 0`). The service's own count of
 * codes in stock changes, so its lists and record are stale with the rest of what a service change outdates.
 */
export function useImportCodes() {
  return useApiMutation({
    mutationFn: ({ serviceId, body }: { serviceId: number; body: ImportCodesBody }) =>
      importInventoryCodes(serviceId, body),
    invalidates: (_result, { serviceId }) => [{ resource: 'inventory-codes' }, ...staleServices(serviceId)],
    invalidateKeys: SERVICE_STALE_KEYS,
    errorNotification: NO_ERROR_TOAST,
    gcTime: 0,
  });
}

/**
 * Takes the ticked unsold codes out of stock. The confirm dialog shows a refusal. The call names only the codes, so the caller also
 * says which services they belong to (`serviceIds`): their lists and records are stale, because their count of codes in stock fell.
 */
export function useVoidCodes() {
  return useApiMutation({
    mutationFn: ({ ids }: { ids: number[]; serviceIds: number[] }) => voidInventoryCodes({ ids }),
    invalidates: (_result, { serviceIds }) => [
      { resource: 'inventory-codes' },
      ...staleServices(...serviceIds),
    ],
    invalidateKeys: SERVICE_STALE_KEYS,
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
