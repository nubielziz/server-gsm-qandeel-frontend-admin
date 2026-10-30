// Types for the storefront policies (`PATCH /admin/storefront/settings`). The demo's `S.settings.policies`. Assumed contract: the
// policies live in the settings as flat keys of these names, and the route takes the same keys back.

/** The yes/no policies of the Policies tab. */
export type BooleanPolicyKey =
  'guestCheckout' | 'require3ds' | 'withdrawalWaiver' | 'autoRefundFailed' | 'imeiPrecheck';

/** The policies that are a number: hours, minutes or days. */
export type NumberPolicyKey = 'refundHoursBeforeDispatch' | 'abandonedMinutes' | 'imeiRetentionDays';

export type PolicyKey = BooleanPolicyKey | NumberPolicyKey;

/** The current value of every policy, read from `GET /admin/settings`; a key the server never set is missing. */
export type StorefrontPolicies = {
  [K in BooleanPolicyKey]?: boolean;
} & {
  [K in NumberPolicyKey]?: number;
};

/** Body of `PATCH /admin/storefront/settings`: only the policies that change. */
export type StorefrontSettingsBody = StorefrontPolicies;
