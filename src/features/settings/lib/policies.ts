// The storefront policies the Policies tab shows: the eight rows of the demo's POLICY_ROWS (55-p-settings.js) with their texts, which
// of them are switches and which are numbers, and how the values are read from the settings. Names of the keys are assumed (HANDOFF).
import { isApiError } from '@/lib/api';
import type { PolicyKey, Settings, StorefrontPolicies } from '../types';

/** One row of the tab. `unit` is the text after a number box; `warning` shows while a switch is off. */
export type PolicySpec = {
  key: PolicyKey;
  label: string;
  hint: string;
  unit?: string;
  warning?: string;
};

/** The rows in the demo's order. */
export const POLICY_ROWS: readonly PolicySpec[] = [
  {
    key: 'guestCheckout',
    label: 'Guest checkout',
    hint: 'Customers can buy with just an email. Off means everyone must create an account first, which loses most first-time buyers.',
  },
  {
    key: 'require3ds',
    label: 'Require 3D Secure',
    hint: 'The bank checks the cardholder. Fewer fraud chargebacks, a few more abandoned payments. This is also the 3D Secure rule under Risk & checks.',
    warning: 'Without 3D Secure the bank can blame you for fraud chargebacks.',
  },
  {
    key: 'withdrawalWaiver',
    label: 'Ask for the cancel-right waiver at checkout',
    hint: 'In the UK and EU, a digital service that starts at once only skips the 14-day cancel right if the customer clearly agrees. Have a lawyer confirm the wording for each country you sell to.',
    warning: 'Without this, customers can cancel for 14 days after you have already paid the supplier.',
  },
  {
    key: 'autoRefundFailed',
    label: 'Refund failed unlocks automatically',
    hint: 'When a supplier rejects the order, the customer is refunded without waiting for a person.',
  },
  {
    key: 'imeiPrecheck',
    label: 'Check the IMEI before payment',
    hint: 'A blacklisted phone is turned away before the customer pays, so no refund is ever needed.',
  },
  {
    key: 'refundHoursBeforeDispatch',
    label: 'Cancel freely within',
    unit: 'hours of paying, if not yet sent',
    hint: 'Until the order goes to a supplier the customer can cancel on their own.',
  },
  {
    key: 'abandonedMinutes',
    label: 'Send a reminder after',
    unit: 'minutes at checkout',
    hint: 'One email to people who left an address and did not pay.',
  },
  {
    key: 'imeiRetentionDays',
    label: 'Keep the IMEI for',
    unit: 'days after the order',
    hint: 'Then it is removed from the order. An IMEI tied to a person is personal data, so keep this as short as support allows.',
  },
];

/** The keys of the policies, for the System tab to leave them to this one. */
export const POLICY_KEYS: readonly string[] = POLICY_ROWS.map((row) => row.key);

const SWITCHES: readonly PolicyKey[] = [
  'guestCheckout',
  'require3ds',
  'withdrawalWaiver',
  'autoRefundFailed',
  'imeiPrecheck',
];

/** Whether a policy is a yes/no switch (the others are numbers). */
export function isSwitchPolicy(key: PolicyKey): boolean {
  return SWITCHES.includes(key);
}

/** The policies in the settings, each only when it has the right type (a key the server never set is left out). */
export function policiesOf(settings: Settings | undefined): StorefrontPolicies {
  const out: Record<string, boolean | number> = {};
  for (const { key } of POLICY_ROWS) {
    const value = settings?.[key];
    if (isSwitchPolicy(key) ? typeof value === 'boolean' : typeof value === 'number')
      out[key] = value as boolean | number;
  }
  return out as StorefrontPolicies;
}

/** A whole number from the text of a number box, or null when it is not one. The range is the server's to judge. */
export function wholeNumber(text: string): number | null {
  return /^\d{1,7}$/.test(text.trim()) ? Number(text.trim()) : null;
}

/** The toast for a switch: "Guest checkout is on". */
export function switchToast(spec: PolicySpec, on: boolean): string {
  return `${spec.label} is ${on ? 'on' : 'off'}`;
}

/**
 * The message the server gave for one policy: the one under its field name, else the problem's own text. The server may write the
 * field with a prefix (`policies.abandonedMinutes`), so the end of the name counts.
 */
export function policyMessage(error: unknown, key: string): string {
  if (!isApiError(error)) return error instanceof Error ? error.message : 'The setting was not saved.';
  const hit = Object.entries(error.fieldErrors).find(([name]) => name === key || name.endsWith(`.${key}`));
  return hit?.[1][0] ?? error.detail ?? error.title;
}
