// Words for the pricing rules table and form: what a rule covers, what it does to the price, its rounding and its dates.
// Ports the "Category rules" rows of rulesTab in 43-p-services.js (`+x%` / `-x%` adjustments), extended to the map's rule columns.
import type { SelectOption } from '@/components/ui';
import { fmtDay, money } from '@/lib/format';
import type { PricingRounding, PricingRule, PricingRuleKind, PricingRuleScope } from '../types';
import { percentText } from './money';

/** What a rule can cover, for the dialog's menu. */
export const SCOPE_OPTIONS: readonly (SelectOption & { value: PricingRuleScope })[] = [
  { value: 'global', label: 'Every service' },
  { value: 'category', label: 'A category' },
  { value: 'service', label: 'One service' },
];

/** The kinds of rule, for the dialog's menu. */
export const KIND_OPTIONS: readonly (SelectOption & { value: PricingRuleKind })[] = [
  { value: 'margin', label: 'Margin (adds to the price)' },
  { value: 'discount', label: 'Discount (takes from the price)' },
  { value: 'promo', label: 'Promo (a discount for a time)' },
];

/** The kind in one word, for the table. */
export const KIND_LABEL: Record<PricingRuleKind, string> = {
  margin: 'Margin',
  discount: 'Discount',
  promo: 'Promo',
};

/** How a rule can round the price, for the dialog's menu. */
export const ROUNDING_OPTIONS: readonly (SelectOption & { value: PricingRounding })[] = [
  { value: 'none', label: 'No rounding' },
  { value: 'nearest_0.05', label: 'Nearest $0.05' },
  { value: 'nearest_0.10', label: 'Nearest $0.10' },
  { value: 'ends_99', label: 'Ends in .99' },
];

/** What the rule covers: "Every service", "Carrier unlock (category)" or "Samsung FRP Remote (service)". */
export function appliesToText(rule: Pick<PricingRule, 'scope' | 'target' | 'targetId'>): string {
  if (rule.scope === 'global') return 'Every service';
  const name = rule.target?.name ?? `#${rule.targetId ?? '?'}`;
  return `${name} (${rule.scope})`;
}

/**
 * What the rule does to the price, as the demo wrote its adjustments: `+5%` for a margin, a minus sign and `2%` for a
 * discount or promo, with a fixed amount after the percentage when there is one. A rule with neither shows a dash.
 */
export function adjustmentText(rule: Pick<PricingRule, 'kind' | 'percent' | 'fixed'>): string {
  const sign = rule.kind === 'margin' ? '+' : '−';
  const parts: string[] = [];
  if (Number(rule.percent) !== 0) parts.push(`${sign}${percentText(rule.percent)}`);
  if (Number(rule.fixed) !== 0) parts.push(`${sign}${money(rule.fixed)}`);
  return parts.length > 0 ? parts.join(' ') : '–';
}

/** The dates of a promo: "From Thu, 05 Mar to Fri, 20 Mar", "Until …", "From …", or an empty text for no dates. */
export function datesText(rule: Pick<PricingRule, 'startsAt' | 'endsAt'>): string {
  const from = fmtDay(rule.startsAt);
  const to = fmtDay(rule.endsAt);
  if (from && to) return `From ${from} to ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return '';
}

/** The small print under a rule's adjustment: the rounding, the profit it keeps and its priority. */
export function ruleDetails(rule: Pick<PricingRule, 'rounding' | 'minProfit' | 'priority'>): string {
  const parts: string[] = [];
  if (rule.rounding !== 'none') {
    parts.push(ROUNDING_OPTIONS.find((option) => option.value === rule.rounding)?.label ?? rule.rounding);
  }
  if (Number(rule.minProfit) !== 0) parts.push(`keeps ${money(rule.minProfit)} profit`);
  parts.push(`priority ${rule.priority}`);
  return parts.join(' · ');
}
