// The roles (a Refine list) and the permission catalog the role dialog offers.
import { useList } from '@refinedev/core';
import { useApiQuery } from '@/lib/query';
import { listPermissions } from '../api';
import type { Role } from '../types';
import { PERMISSIONS_KEY } from './keys';
import { LIST_CAP } from './useStaffList';

/** The roles with their permissions, loaded whole (there are few). */
export function useRoles(options: { enabled?: boolean } = {}) {
  const { result, query } = useList<Role>({
    resource: 'roles',
    pagination: { currentPage: 1, pageSize: LIST_CAP },
    queryOptions: { enabled: options.enabled ?? true },
    errorNotification: false,
  });
  return { roles: result.data, total: result.total, query };
}

/** Every permission that exists, normalised. It rarely changes, so it is kept for a few minutes. */
export function usePermissionCatalog(options: { enabled?: boolean } = {}) {
  return useApiQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: ({ signal }) => listPermissions({ signal }),
    enabled: options.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}
