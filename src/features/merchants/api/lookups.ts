// One read-only lookup for the "Add override" dialog: the services by name. The services feature owns this route and will
// export its own typed function; this one stays here without a route tag so the route coverage count is not claimed twice.
// Replace it with that function then.
import { apiList, type ApiInit, type ListResult } from '@/lib/api';
import type { ServiceOption } from '../types';

/** Most services one menu loads. A longer catalog would need a search box; the demo's menu was a plain select too. */
export const SERVICE_LOOKUP_CAP = 200;

/**
 * The active services (id, name, type, floor price), for the service menu of the Add override dialog. Needs the
 * catalog's read permission, which the dialog names when the list cannot be read.
 * Assumed contract: rows carry `id`, `name`, `type`, `status` and optionally `floorPrice`.
 */
export function listServiceOptions(init?: ApiInit): Promise<ListResult<ServiceOption>> {
  return apiList<ServiceOption>(
    '/admin/services',
    { start: 0, end: SERVICE_LOOKUP_CAP, sort: ['name'], order: ['asc'], filters: { status: 'active' } },
    undefined,
    init,
  );
}
