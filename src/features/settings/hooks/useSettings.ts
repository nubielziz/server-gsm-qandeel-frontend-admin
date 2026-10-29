// The system settings as a cached read. The settings page will use it for its tabs; the access page reads the
// admin-console restriction from it.
import { useApiQuery } from '@/lib/query';
import { getSettings } from '../api';

/** Query key of the settings read; a mutation that changes a setting invalidates it. */
export const SETTINGS_KEY = ['api', 'settings'] as const;

/** `data` is the flat settings object. Pass `enabled: false` while the staff member may not read settings. */
export function useSettings(options: { enabled?: boolean } = {}) {
  return useApiQuery({
    queryKey: SETTINGS_KEY,
    queryFn: ({ signal }) => getSettings({ signal }),
    enabled: options.enabled ?? true,
  });
}
