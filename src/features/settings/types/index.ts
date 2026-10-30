// Types for the settings feature: the system settings (`/admin/settings`, key and value pairs; the map gives no bodies) and,
// re-exported below, the types of each tab (payment methods, tax and currency, policies, emails, logs).
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
  /** Days an order's IMEI is kept before it is removed (assumed key; the customers page shows it). */
  imeiRetentionDays?: number;
};

/** Body of `PATCH /admin/settings`: only the keys that change (assumed contract). */
export type UpdateSettingsBody = Partial<Settings>;

export * from './currencies';
export * from './gateways';
export * from './notifications';
export * from './storefront';
export * from './tax';
export * from './webhooks';
