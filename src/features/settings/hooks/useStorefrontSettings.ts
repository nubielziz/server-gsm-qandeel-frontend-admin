// Saving the policies (`PATCH /admin/storefront/settings`) and the typed system settings (`PATCH /admin/settings`). Both change what
// `GET /admin/settings` answers, so they refresh it. The caller shows a failure next to the field that caused it.
import { useApiMutation } from '@/lib/query';
import { updateSettings, updateStorefrontSettings } from '../api';
import type { StorefrontSettingsBody, UpdateSettingsBody } from '../types';
import { SETTINGS_KEY } from './useSettings';

/** Saves some policies. The toast is the caller's, because a switch and a number box say different things. */
export function useSavePolicies() {
  return useApiMutation({
    mutationFn: (body: StorefrontSettingsBody) => updateStorefrontSettings(body),
    invalidateKeys: [[...SETTINGS_KEY]],
    errorNotification: () => false,
  });
}

/** Saves some system settings. */
export function useSaveSystemSettings() {
  return useApiMutation({
    mutationFn: (body: UpdateSettingsBody) => updateSettings(body),
    invalidateKeys: [[...SETTINGS_KEY]],
    successNotification: () => ({ message: 'Setting saved' }),
    errorNotification: () => false,
  });
}
