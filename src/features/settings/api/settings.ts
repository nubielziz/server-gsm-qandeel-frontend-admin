// The system settings routes (`/admin/settings`). The settings page (a later feature) builds on these two functions;
// the access page already reads the admin-console restriction from them. The map gives no bodies, so the shapes are
// assumed contracts (MISMATCHES M10).
import { apiGet, apiPatch, type ApiInit } from '@/lib/api';
import type { Settings, UpdateSettingsBody } from '../types';

/**
 * Reads the system settings as one flat object of keys. The access page needs it for the state of the
 * admin-console IP restriction (`adminAllowlistOnly`).
 * Assumed contract: `{ [key]: value }`.
 * @route GET /admin/settings
 */
export function getSettings(init?: ApiInit): Promise<Settings> {
  return apiGet<Settings>('/admin/settings', undefined, init);
}

/**
 * Changes settings; only the keys that change are sent. Every change is written to the audit log by the server.
 * Assumed contract: body `{ [key]: value }`, answer the settings after the change.
 * @route PATCH /admin/settings
 */
export function updateSettings(body: UpdateSettingsBody, init?: ApiInit): Promise<Settings> {
  return apiPatch<Settings>('/admin/settings', body, init);
}
