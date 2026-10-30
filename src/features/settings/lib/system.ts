// The System tab: the settings keys this console knows how to edit, the ones it only shows, and what is left (shown as JSON, read-only).
// `GET /admin/settings` is one flat object (assumed contract, M10). Policy keys belong to the Policies tab and are not repeated here.
import type { JsonValue } from '@/lib/api';
import type { Settings } from '../types';
import { POLICY_KEYS } from './policies';

/** A setting the tab can edit with a typed field. */
export type SettingSpec = {
  key: string;
  label: string;
  type: 'integer';
  unit: string;
  hint: string;
  /** The range the field accepts; a hint, the server decides. */
  min: number;
  max: number;
};

/** The settings with a typed form. More keys are added here when the backend names them. */
export const KNOWN_SETTINGS: readonly SettingSpec[] = [
  {
    key: 'imeiRetentionDays',
    label: 'IMEI retention',
    type: 'integer',
    unit: 'days after the order',
    hint: 'How long an order keeps its IMEI before it is removed. The Policies tab shows the same setting.',
    min: 0,
    max: 3650,
  },
];

/** A setting this tab shows but another page edits. */
export type LinkedSetting = { key: string; label: string; hint: string; to: string; linkLabel: string };

export const LINKED_SETTINGS: readonly LinkedSetting[] = [
  {
    key: 'adminAllowlistOnly',
    label: 'Only allowed IPs can open the console',
    hint: 'It is changed on the Admins and access page, which checks that you keep your own access.',
    to: '/access?tab=allow',
    linkLabel: 'Open Admins and access',
  },
];

/** Every key the console handles somewhere, so none of them is shown as unknown. */
const HANDLED_KEYS: readonly string[] = [
  ...KNOWN_SETTINGS.map((spec) => spec.key),
  ...LINKED_SETTINGS.map((setting) => setting.key),
  ...POLICY_KEYS,
];

/** The keys nobody on this console edits, with their values, in key order (a key set to `undefined` is left out). */
export function unknownSettings(settings: Settings | undefined): [string, JsonValue][] {
  return Object.entries(settings ?? {})
    .filter(
      (entry): entry is [string, JsonValue] => entry[1] !== undefined && !HANDLED_KEYS.includes(entry[0]),
    )
    .sort(([a], [b]) => a.localeCompare(b));
}

/** The value of a known setting as the text of its field; empty when the server has not set it. */
export function fieldText(settings: Settings | undefined, spec: SettingSpec): string {
  const value = settings?.[spec.key];
  return typeof value === 'number' ? String(value) : '';
}

/** The message for a value outside the field's range or not a whole number, or null when it is fine. */
export function settingProblem(spec: SettingSpec, text: string): string | null {
  const value = text.trim();
  if (!/^\d{1,7}$/.test(value)) return 'Enter a whole number.';
  const number = Number(value);
  return number >= spec.min && number <= spec.max ? null : `Enter ${spec.min} to ${spec.max}.`;
}
