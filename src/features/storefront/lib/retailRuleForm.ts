// The retail pricing rule form: its values, how they become the request bodies, and which fields an edit changed. The form
// only reshapes text (a typed 30 goes out as "30.0000"); it checks the shape of a number as a hint and never its range, never
// works out a price: the server refuses a figure outside its limits and the console shows its words under the field.
import type { ServiceType } from '@/features/orders';
import { isMoneyText, moneyInput, toMoneyText } from './money';
import type {
  CreateRetailPriceRuleBody,
  RetailPriceRule,
  RetailRounding,
  RetailRuleScope,
  UpdateRetailPriceRuleBody,
} from '../types';

/** What the form holds, all as text so the server's answer can be shown back as typed. */
export type RuleValues = {
  scope: RetailRuleScope;
  serviceType: ServiceType | '';
  categoryId: string;
  percent: string;
  fixed: string;
  rounding: RetailRounding;
  roundFrom: string;
  autoFollowPercent: string;
};

/** The names of the form's fields, for `dialogSubmit`. */
export const RULE_FIELDS: readonly (keyof RuleValues)[] = [
  'scope',
  'serviceType',
  'categoryId',
  'percent',
  'fixed',
  'rounding',
  'roundFrom',
  'autoFollowPercent',
];

/**
 * The server may name a field of the previewed rule with the path of the preview's body (`change.rule.percent`): each one is
 * mapped back to the form field of the same name.
 */
export const RULE_FIELD_ALIASES: Readonly<Record<string, string>> = Object.fromEntries(
  RULE_FIELDS.flatMap((field) => [
    [`change.rule.${field}`, field],
    [`rule.${field}`, field],
  ]),
);

// The server's own defaults (plan 3.3): the rounding starts at $5.00 and a cost may move 25% before a change waits.
const DEFAULT_ROUND_FROM = '5.00';
const DEFAULT_AUTO_FOLLOW = '25';

/** A decimal figure of up to four places, such as `30` or `12.5`. A hint for the form; the server decides. */
export function isPercentText(text: string): boolean {
  return /^\d+(\.\d{1,4})?$/.test(text.trim());
}

/** A typed percentage as the API's four-decimal text: `"30"` becomes `"30.0000"`. Pads text; it does no arithmetic. */
export function toPercentText(text: string): string {
  const [whole, fraction = ''] = text.trim().split('.');
  return `${whole}.${fraction.padEnd(4, '0')}`;
}

/** An API percentage for an input: `"30.0000"` shows `30` and `"12.5000"` shows `12.5`. */
export function percentInput(value: string): string {
  const [whole, fraction = ''] = value.trim().split('.');
  const rest = fraction.replace(/0+$/, '');
  return rest ? `${whole}.${rest}` : whole;
}

/**
 * The first values of the form. A rule being edited shows its own figures; a new rule starts on "Every service" with the
 * server's defaults, or, for the first rule of the shop, on the owner's example (IMEI services, 30%, ends in .99).
 */
export function ruleValues(rule?: RetailPriceRule, example = false): RuleValues {
  if (rule) {
    return {
      scope: rule.scope,
      serviceType: rule.serviceType ?? '',
      categoryId: rule.categoryId === null ? '' : String(rule.categoryId),
      percent: percentInput(rule.percent),
      fixed: moneyInput(rule.fixed),
      rounding: rule.rounding,
      roundFrom: moneyInput(rule.roundFrom),
      autoFollowPercent: String(rule.autoFollowPercent),
    };
  }
  return {
    scope: example ? 'type' : 'global',
    serviceType: example ? 'imei' : '',
    categoryId: '',
    percent: example ? '30' : '',
    fixed: '',
    rounding: example ? 'ends_99' : 'cent',
    roundFrom: DEFAULT_ROUND_FROM,
    autoFollowPercent: DEFAULT_AUTO_FOLLOW,
  };
}

type Built<T> = { body: T } | { error: string; field: keyof RuleValues };

/** Checks the shape of the typed numbers and builds the `POST` body. Ranges and duplicates are the server's to refuse. */
export function buildRuleBody(values: RuleValues): Built<CreateRetailPriceRuleBody> {
  if (values.scope === 'type' && !values.serviceType)
    return { error: 'Choose a service type.', field: 'serviceType' };
  if (values.scope === 'category' && !values.categoryId)
    return { error: 'Choose a category.', field: 'categoryId' };
  if (!isPercentText(values.percent)) {
    return { error: 'Enter a margin as a number, for example 30 or 12.5.', field: 'percent' };
  }
  if (values.fixed.trim() !== '' && !isMoneyText(values.fixed)) {
    return { error: 'Enter an amount in dollars, for example 0.50, or leave it empty.', field: 'fixed' };
  }
  if (!isMoneyText(values.roundFrom)) {
    return { error: 'Enter an amount in dollars, for example 5.00.', field: 'roundFrom' };
  }
  if (!/^\d+$/.test(values.autoFollowPercent.trim())) {
    return { error: 'Enter a whole number, for example 25.', field: 'autoFollowPercent' };
  }
  return {
    body: {
      scope: values.scope,
      ...(values.scope === 'type' ? { serviceType: values.serviceType as ServiceType } : {}),
      ...(values.scope === 'category' ? { categoryId: Number(values.categoryId) } : {}),
      percent: toPercentText(values.percent),
      fixed: toMoneyText(values.fixed.trim() === '' ? '0' : values.fixed),
      rounding: values.rounding,
      roundFrom: toMoneyText(values.roundFrom),
      autoFollowPercent: Number(values.autoFollowPercent),
    },
  };
}

/** The figures of the form that differ from the rule: the only keys an edit sends (the scope and target never change). */
export function changedRuleFields(
  body: CreateRetailPriceRuleBody,
  rule: RetailPriceRule,
): UpdateRetailPriceRuleBody {
  const changed: UpdateRetailPriceRuleBody = {};
  if (body.percent !== rule.percent) changed.percent = body.percent;
  if (body.fixed !== rule.fixed) changed.fixed = body.fixed;
  if (body.rounding !== rule.rounding) changed.rounding = body.rounding;
  if (body.roundFrom !== rule.roundFrom) changed.roundFrom = body.roundFrom;
  if (body.autoFollowPercent !== rule.autoFollowPercent) changed.autoFollowPercent = body.autoFollowPercent;
  return changed;
}
