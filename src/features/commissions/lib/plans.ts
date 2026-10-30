// Plan helpers for the Plans tab and its dialog: the kinds, the rate check, and the plan's conditions (`tiers`, free JSON) as
// a short summary for the table and as editable text for the dialog. Ports the plan columns of plansTab in 46-p-commissions.js.
import type { SelectOption } from '@/components/ui';
import { pct } from '@/lib/format';
import type { JsonObject, JsonValue } from '@/lib/api';
import type { CommissionPlan, PlanKind } from '../types';

/** The kinds a plan can have, as the screen words them. */
export const KIND_LABEL: Record<PlanKind, string> = { referral: 'Referral', rebate: 'Rebate' };

/** The kind menu of the plan dialog. */
export const KIND_OPTIONS: readonly { value: PlanKind; label: string }[] = [
  { value: 'referral', label: 'Referral (paid to the agent who brought a merchant)' },
  { value: 'rebate', label: 'Rebate (paid back on a merchant’s own orders)' },
];

/** The kind in words; a kind this version does not know is shown as the server sent it. */
export function kindLabel(kind: string): string {
  return Object.hasOwn(KIND_LABEL, kind) ? KIND_LABEL[kind as PlanKind] : kind;
}

/** A rate typed in the dialog: a positive number of at most 100, with an optional fraction. The server applies its own limits. */
export function isRateText(text: string): boolean {
  const value = text.trim();
  return /^\d{1,3}(\.\d{1,4})?$/.test(value) && Number(value) > 0 && Number(value) <= 100;
}

function shortValue(value: JsonValue): string {
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
  if (value !== null && typeof value === 'object') return '…';
  return String(value);
}

/** The plan's conditions in one line for the table: "minPayout: 50.0000, minReferrals: 3". An empty object is a dash. */
export function conditionsText(tiers: JsonObject | null | undefined): string {
  const entries = Object.entries(tiers ?? {});
  if (entries.length === 0) return '–';
  return entries.map(([key, value]) => `${key}: ${shortValue(value)}`).join(', ');
}

/** The conditions as the dialog's text: formatted JSON, or nothing for an empty object. */
export function conditionsToField(tiers: JsonObject | null | undefined): string {
  return Object.keys(tiers ?? {}).length === 0 ? '' : JSON.stringify(tiers, null, 2);
}

/** What typing conditions gave: the object, or a sentence for the field. */
export type ParsedConditions = { ok: true; value: JsonObject } | { ok: false; message: string };

/** Reads the dialog's conditions text. Empty means no conditions (`{}`); anything but a JSON object is refused. */
export function parseConditions(text: string): ParsedConditions {
  if (text.trim() === '') return { ok: true, value: {} };
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { ok: true, value: value as JsonObject };
    }
  } catch {
    // Falls through to the message below.
  }
  return { ok: false, message: 'Enter the conditions as a JSON object, for example {"minPayout": "50"}.' };
}

/** Whether two condition objects hold the same data (key order does not matter), so an edit sends them only when they changed. */
export function sameConditions(a: JsonObject, b: JsonObject): boolean {
  const sorted = (value: JsonValue): JsonValue => {
    if (Array.isArray(value)) return value.map(sorted);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, sorted(value[key])]),
      );
    }
    return value;
  };
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}

/** The plan menu of the assign and change dialogs: each plan with its rate, and a plan that is switched off marked as such. */
export function planChoices(plans: readonly CommissionPlan[]): SelectOption[] {
  return plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} (${pct(plan.percent, 1)})${plan.isActive ? '' : ' – off'}`,
  }));
}
