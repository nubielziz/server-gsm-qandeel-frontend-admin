// Registers the audit log as a Refine resource for the data hooks (decision 005). The data provider calls these same typed
// functions, so the list and a single entry share one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { getAuditLog, listAuditLogs } from './auditLogs';

/** The log can be listed and read; entries are never created, changed or deleted from the console. */
export const auditResources: ResourceRegistry = {
  'audit-logs': { list: listAuditLogs, show: getAuditLog },
};
