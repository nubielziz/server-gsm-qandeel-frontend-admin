// Maintenance mode from the System health header: `PUT /admin/system/maintenance`. The current state is part of
// `getSystemHealth`. Assumed contract (the map gives no body).
import { apiPut, type ApiInit } from '@/lib/api';
import type { MaintenanceState, SetMaintenanceBody } from '../types';

/**
 * Switches maintenance on (or changes it) with a scope, a message for customers and an expected end, or switches it
 * off. The chosen scope then answers 503 MAINTENANCE; the admin console is never affected, so staff are not locked
 * out. The server stores the switch in settings and writes the audit log entry.
 * Assumed contract: body `SetMaintenanceBody`; answer the new `MaintenanceState`. The console does not read the
 * answer: it reads the health summary again.
 * @route PUT /admin/system/maintenance
 */
export function setMaintenance(body: SetMaintenanceBody, init?: ApiInit): Promise<MaintenanceState> {
  return apiPut<MaintenanceState>('/admin/system/maintenance', body, init);
}
