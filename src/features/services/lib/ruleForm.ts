// The pricing rule dialog's form turned into the request body (and back), and what changed on an edit. The checks are hints so
// an empty or odd value never leaves the browser; the server validates the rule for real. Amounts stay text from the form to the API.
import type {
  CreatePricingRuleBody,
  PricingRounding,
  PricingRule,
  PricingRuleKind,
  PricingRuleScope,
  UpdatePricingRuleBody,
} from '../types';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from './money';

/** What the form holds: ids and numbers as the text of their inputs, dates as `YYYY-MM-DD` (the admin's own calendar days). */
export type RuleValues = {
  scope: PricingRuleScope;
  targetId: string;
  groupId: string;
  kind: PricingRuleKind;
  percent: string;
  fixed: string;
  rounding: PricingRounding;
  minProfit: string;
  priority: string;
  startsAt: string;
  endsAt: string;
};

/** The form for a new rule, or filled in from the rule being edited. */
export function ruleValues(rule?: PricingRule): RuleValues {
  const amount = (value: string | undefined) => (value && Number(value) !== 0 ? moneyInput(value) : '');
  return {
    scope: rule?.scope ?? 'category',
    targetId: rule?.targetId ? String(rule.targetId) : '',
    groupId: rule?.groupId ? String(rule.groupId) : '',
    kind: rule?.kind ?? 'discount',
    percent: rule && Number(rule.percent) !== 0 ? String(Number(rule.percent)) : '',
    fixed: amount(rule?.fixed),
    rounding: rule?.rounding ?? 'none',
    minProfit: amount(rule?.minProfit),
    priority: String(rule?.priority ?? 100),
    startsAt: rule?.startsAt ? dayOf(rule.startsAt) : '',
    endsAt: rule?.endsAt ? dayOf(rule.endsAt) : '',
  };
}

/** The request body, or the first mistake and the field it belongs to. */
export type RuleBodyResult = { body: CreatePricingRuleBody } | { error: string; field: keyof RuleValues };

const pad = (n: number) => String(n).padStart(2, '0');

/** The calendar day of a stored moment in the browser's time zone, as a date input holds it: `2026-03-05`. */
export function dayOf(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The first moment of a calendar day (browser time zone) as the API's ISO text: where a promo starts. */
export function dayStart(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString();
}

/** The last moment of a calendar day (browser time zone) as the API's ISO text: where a promo ends. */
export function dayEnd(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}

const amountOrZero = (text: string) => (text.trim() === '' ? '0.0000' : toMoneyText(text));

/** The request body for the form, or the first mistake to show under its field. */
export function buildRuleBody(values: RuleValues): RuleBodyResult {
  if (values.scope !== 'global' && !/^\d+$/.test(values.targetId)) {
    return { error: `Choose the ${values.scope}.`, field: 'targetId' };
  }
  for (const field of ['percent', 'fixed', 'minProfit'] as const) {
    if (values[field].trim() !== '' && !isMoneyText(values[field])) {
      return { error: 'Enter a number such as 2 or 0.50.', field };
    }
  }
  if (Number(values.percent || 0) === 0 && Number(values.fixed || 0) === 0) {
    return { error: 'Enter a percent or a fixed amount.', field: 'percent' };
  }
  if (!/^\d+$/.test(values.priority.trim())) return { error: 'Enter a whole number.', field: 'priority' };
  if (values.startsAt && values.endsAt && values.endsAt < values.startsAt) {
    return { error: 'The end date is before the start date.', field: 'endsAt' };
  }
  return {
    body: {
      scope: values.scope,
      targetId: values.scope === 'global' ? null : Number(values.targetId),
      groupId: /^\d+$/.test(values.groupId) ? Number(values.groupId) : null,
      kind: values.kind,
      percent: amountOrZero(values.percent),
      fixed: amountOrZero(values.fixed),
      rounding: values.rounding,
      minProfit: amountOrZero(values.minProfit),
      priority: Number(values.priority),
      // Dates are whole days of the admin's calendar: a promo starts at the first moment of its first day and ends at the
      // last moment of its last day.
      startsAt: values.startsAt ? dayStart(values.startsAt) : null,
      endsAt: values.endsAt ? dayEnd(values.endsAt) : null,
    },
  };
}

/** Only the fields of `body` that differ from the rule, so an edit sends what the admin changed. */
export function changedRuleFields(body: CreatePricingRuleBody, rule: PricingRule): UpdatePricingRuleBody {
  const changes: UpdatePricingRuleBody = {};
  const same: Record<keyof CreatePricingRuleBody, boolean> = {
    scope: body.scope === rule.scope,
    targetId: body.targetId === (rule.targetId ?? null),
    groupId: body.groupId === (rule.groupId ?? null),
    kind: body.kind === rule.kind,
    percent: sameMoney(body.percent, rule.percent),
    fixed: sameMoney(body.fixed, rule.fixed),
    rounding: body.rounding === rule.rounding,
    minProfit: sameMoney(body.minProfit, rule.minProfit),
    priority: body.priority === rule.priority,
    startsAt: (body.startsAt ? dayOf(body.startsAt) : null) === (rule.startsAt ? dayOf(rule.startsAt) : null),
    endsAt: (body.endsAt ? dayOf(body.endsAt) : null) === (rule.endsAt ? dayOf(rule.endsAt) : null),
  };
  for (const key of Object.keys(same) as (keyof CreatePricingRuleBody)[]) {
    if (!same[key]) Object.assign(changes, { [key]: body[key] });
  }
  return changes;
}
