// The menus the pricing and inventory screens choose from: the services (by name), the categories, the merchant groups and the
// merchants. The group and merchant lists are read once and kept for a few minutes: they change rarely, and a menu should not
// wait for a request each time a dialog opens.
import { useList } from '@refinedev/core';
import { useApiQuery } from '@/lib/query';
import { listServices } from '../api';
import { listGroupOptions, listMerchantOptions } from '../api/lookups';
import type { ServiceCategory } from '../types';
import { LOOKUP_STALE_MS, PICKER_CAP, SERVICE_LOOKUP_KEY, SERVICE_PICKER_KEY } from './keys';

/** The services by name, for the resolver, the inventory filter and the import dialog. Needs `catalog:read`. */
export function useServiceChoices(enabled = true) {
  return useApiQuery({
    queryKey: [...SERVICE_PICKER_KEY],
    queryFn: ({ signal }) =>
      listServices({ start: 0, end: PICKER_CAP, sort: ['name'], order: ['asc'] }, { signal }),
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

/** The merchant groups with their discounts. Pass `enabled: false` when the staff member lacks `groups:read`. */
export function useGroupOptions(enabled = true) {
  return useApiQuery({
    queryKey: [...SERVICE_LOOKUP_KEY, 'groups'],
    queryFn: ({ signal }) => listGroupOptions({ signal }),
    select: (result) => result.data,
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
