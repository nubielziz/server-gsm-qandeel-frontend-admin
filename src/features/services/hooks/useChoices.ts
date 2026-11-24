// The menus the pricing, inventory and services screens choose from: the services (by name), the categories, the ranks, the
// merchants and the suppliers. The group, merchant and supplier lists are read once and kept for a few minutes: they change rarely,
// and a menu should not wait for a request each time a dialog opens.
import { useList } from '@refinedev/core';
import { listSuppliers } from '@/features/suppliers';
import { useApiQuery } from '@/lib/query';
import { listServices } from '../api';
import { listGroupOptions, listMerchantOptions } from '../api/lookups';
import type { ServiceCategory, ServiceType } from '../types';
import { LOOKUP_STALE_MS, PICKER_CAP, SERVICE_LOOKUP_KEY, SERVICE_PICKER_KEY } from './keys';

/**
 * The services by name, for the resolver, the inventory filter and the import dialog. Needs `catalog:read`. With `type` only the
 * services of that kind are listed (the Product / Services page's strip); the key carries it, under the same prefix.
 */
export function useServiceChoices(enabled = true, type?: ServiceType) {
  return useApiQuery({
    queryKey: type ? [...SERVICE_PICKER_KEY, type] : [...SERVICE_PICKER_KEY],
    queryFn: ({ signal }) =>
      listServices(
        { start: 0, end: PICKER_CAP, sort: ['name'], order: ['asc'], ...(type ? { filters: { type } } : {}) },
        { signal },
      ),
    select: (result) => result.data,
    enabled,
    staleTime: LOOKUP_STALE_MS,
  });
}

/** The categories, loaded whole (there are few). Needs `catalog:read`. */
export function useCategories(enabled = true) {
  const { result, query } = useList<ServiceCategory>({
    resource: 'service-categories',
    pagination: { currentPage: 1, pageSize: PICKER_CAP },
    sorters: [{ field: 'sort', order: 'asc' }],
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { categories: result.data, total: result.total, query };
}

/** The ranks with their discounts. Pass `enabled: false` when the staff member lacks `groups:read`. */
export function useGroupOptions(enabled = true) {
  return useApiQuery({
    queryKey: [...SERVICE_LOOKUP_KEY, 'groups'],
    queryFn: ({ signal }) => listGroupOptions({ signal }),
    select: (result) => result.data,
    enabled,
    staleTime: LOOKUP_STALE_MS,
  });
}

/**
 * The suppliers by name, for the services list's supplier filter (ids and names only). The suppliers feature owns
 * `GET /admin/suppliers`; pass `enabled: false` when the staff member lacks `suppliers:read`.
 */
export function useSupplierChoices(enabled = true) {
  return useApiQuery({
    queryKey: [...SERVICE_LOOKUP_KEY, 'suppliers'],
    queryFn: ({ signal }) =>
      listSuppliers({ start: 0, end: PICKER_CAP, sort: ['name'], order: ['asc'] }, { signal }),
    select: (result) => result.data.map(({ id, name }) => ({ id, name })),
    enabled,
    staleTime: LOOKUP_STALE_MS,
  });
}

/** The merchants. Pass `enabled: false` when the staff member lacks `clients:read`. */
export function useMerchantOptions(enabled = true) {
  return useApiQuery({
    queryKey: [...SERVICE_LOOKUP_KEY, 'merchants'],
    queryFn: ({ signal }) => listMerchantOptions({ signal }),
    select: (result) => result.data,
    enabled,
    staleTime: LOOKUP_STALE_MS,
  });
}
