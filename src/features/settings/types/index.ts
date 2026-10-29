// Types for the system settings routes (`/admin/settings`). The map describes the `settings` table as key and value
// pairs and gives no bodies, so the settings feature starts with the one key the access page needs and grows later.
import type { JsonValue } from '@/lib/api';

/** Every setting by its key. Values are JSON; a key that was never set is simply missing. */
export type SettingsValues = { [key: string]: JsonValue | undefined };

/**
 * The system settings, as `GET /admin/settings` sends them (assumed contract: one flat object of keys).
 * `adminAllowlistOnly` is the switch behind "only allowed IPs can open the admin console"
 * (assumed key; the map says only that the restriction is "a switch in settings").
 */
export type Settings = SettingsValues & {
  adminAllowlistOnly?: boolean;
};

/** Body of `PATCH /admin/settings`: only the keys that change (assumed contract). */
export type UpdateSettingsBody = Partial<Settings>;
