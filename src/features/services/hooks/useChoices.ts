// The menus the pricing, inventory and services screens choose from: the services (by name), the categories, the ranks, the
// merchants and the suppliers. The group, merchant and supplier lists are read once and kept for a few minutes: they change rarely,
// and a menu should not wait for a request each time a dialog opens.
import { useList } from '@refinedev/core';
import { listSuppliers } from '@/features/suppliers';
import { useApiQuery } from '@/lib/query';
import { listServices } from '../api';
import { listGroupOptions, listMerchantOptions } from '../api/lookups';
import type { Service, ServiceCategory, ServiceType } from '../types';
import {
  CATEGORY_READ_CAP,
  LOOKUP_STALE_MS,
  PICKER_CAP,
  SERVICE_LOOKUP_KEY,
  SERVICE_PICKER_KEY,
} from './keys';

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

/** The services delivered from code stock that a menu lists, and how many the server counts (more than the menu holds when it is capped). */
export type StockServiceChoices = { services: Service[]; total: number };

/**
 * The services that are delivered from code stock, by name, for the Inventory view's service menu and its import dialog (only such a
 * service holds codes). The server does the filtering (`stockDelivery=true`, and the kind when one is given), so a shop with more than
 * `PICKER_CAP` services still finds its stock services; `total` is what the server counts, so a menu can say when its list is short
 * (see {@link isStockMenuShort}). The key sits under the picker prefix, so a service change reads it again. Needs `catalog:read`.
 */
export function useStockServiceChoices(enabled = true, type?: ServiceType) {
  return useApiQuery({
    queryKey: [...SERVICE_PICKER_KEY, 'stock', type ?? 'all'],
    queryFn: ({ signal }) =>
      listServices(
        {
          start: 0,
          end: PICKER_CAP,
          sort: ['name'],
          order: ['asc'],
          filters: { stockDelivery: true, ...(type ? { type } : {}) },
        },
        { signal },
      ),
    select: (result): StockServiceChoices => ({ services: result.data, total: result.total }),
    enabled,
    staleTime: LOOKUP_STALE_MS,
  });
}

/** True when the server counts more stock services than the menu holds, so the menu should say it is a short list. */
export function isStockMenuShort(choices: StockServiceChoices | undefined): boolean {
  return choices !== undefined && choices.total > choices.services.length;
}

/**
 * The categories (groups) of every kind, read in one page of `CATEGORY_READ_CAP` rows and sorted by position; `total` is what the
 * server counts, so a view can say when the page is short. It stays a Refine list on `service-categories`, so a category change that
 * invalidates that resource reads it again. Needs `catalog:read`.
 */
export function useCategories(enabled = true) {
  const { result, query } = useList<ServiceCategory>({
    resource: 'service-categories',
    pagination: { currentPage: 1, pageSize: CATEGORY_READ_CAP },
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
