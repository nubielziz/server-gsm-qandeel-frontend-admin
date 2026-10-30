// Storefront settings (`PATCH /admin/storefront/settings`): the policies of the Policies tab (guest checkout, 3D Secure, the
// refund window…). The payment methods and the email templates have their own routes and tabs. Needs `settings:storefront`.
import { apiPatch, type ApiInit } from '@/lib/api';
import type { StorefrontPolicies, StorefrontSettingsBody } from '../types';

/**
 * Changes storefront policies; only the keys that change are sent. The server validates each value (a field error names the
 * key), writes the audit log and answers the policies after the change. The new values show in `GET /admin/settings` too.
 * Assumed contract: body is flat policy keys (see `StorefrontPolicies`), answer the same keys with their new values.
 * @route PATCH /admin/storefront/settings
 */
export function updateStorefrontSettings(
  body: StorefrontSettingsBody,
  init?: ApiInit,
): Promise<StorefrontPolicies> {
  return apiPatch<StorefrontPolicies>('/admin/storefront/settings', body, init);
}
