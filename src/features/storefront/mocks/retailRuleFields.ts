// What the retail pricing rule routes accept in a body: the figures and the target of a rule, checked with the server's limits and
// answered with its field messages (the mock plays the server for these, nothing more). Shapes only: it works out no price.
import { toMoneyText } from '../lib/money';
import { isPercentText, toPercentText } from '../lib/retailRuleForm';
import type { Id } from '@/lib/api';
import type { RetailRounding, RetailRuleScope } from '../types';
import type { FieldProblem } from './listingFields';
import type { MockRetailRule, PricingStores } from './types';

const ROUNDINGS: readonly RetailRounding[] = ['cent', 'step_0.05', 'step_0.10', 'ends_99'];
const TYPES = ['imei', 'server', 'remote', 'file'] as const;
const SCOPES: readonly RetailRuleScope[] = ['global', 'type', 'category'];
const MONEY = /^\d+(\.\d{1,4})?$/;

/** The text of a number or a string in a body; empty when it is neither. */
function asText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

/** The figures of a rule's body that were sent, checked; a refusal goes to `problems`. `prefix` is the path of the body's rule. */
export function readFigures(
  body: Record<string, unknown>,
  problems: FieldProblem[],
  prefix = '',
): Partial<
  Pick<MockRetailRule, 'percent' | 'fixed' | 'rounding' | 'roundFrom' | 'autoFollowPercent' | 'isActive'>
> {
  const out: ReturnType<typeof readFigures> = {};
  const refuse = (field: string, message: string) => problems.push({ field: `${prefix}${field}`, message });
  if ('percent' in body) {
    const text = asText(body.percent);
    if (!isPercentText(text)) refuse('percent', 'Enter a margin as a number with up to 4 decimals.');
    else if (Number(text) > 1000) refuse('percent', 'The margin can be at most 1,000%.');
    else out.percent = toPercentText(text);
  }
  for (const [key, max] of [
    ['fixed', 100_000],
    ['roundFrom', 100_000],
  ] as const) {
    if (!(key in body)) continue;
    const text = asText(body[key]);
    if (!MONEY.test(text)) refuse(key, 'Enter an amount in dollars with up to 4 decimals.');
    else if (Number(text) > max) refuse(key, 'The amount can be at most $100,000.');
    else out[key] = toMoneyText(text);
  }
  if ('rounding' in body) {
    if (ROUNDINGS.includes(body.rounding as RetailRounding)) out.rounding = body.rounding as RetailRounding;
    else refuse('rounding', 'Choose a rounding.');
  }
  if ('autoFollowPercent' in body) {
    const value = body.autoFollowPercent;
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000)
      out.autoFollowPercent = value;
    else refuse('autoFollowPercent', 'Enter a whole number from 0 to 1,000.');
  }
  if ('isActive' in body) {
    if (typeof body.isActive === 'boolean') out.isActive = body.isActive;
    else refuse('isActive', 'Choose on or off.');
  }
  return out;
}

/** The scope and target of a new rule, checked against the scope and against the rules that exist; a refusal goes to `problems`. */
export function readTarget(
  body: Record<string, unknown>,
  pricing: PricingStores,
  problems: FieldProblem[],
  prefix = '',
): Pick<MockRetailRule, 'scope' | 'serviceType' | 'categoryId'> | null {
  const refuse = (field: string, message: string) => problems.push({ field: `${prefix}${field}`, message });
  const scope = body.scope as RetailRuleScope;
  if (!SCOPES.includes(scope)) {
    refuse('scope', 'Choose what the rule applies to.');
    return null;
  }
  const type = body.serviceType;
  const category = body.categoryId;
  const serviceType =
    scope === 'type' && TYPES.includes(type as (typeof TYPES)[number])
      ? (type as (typeof TYPES)[number])
      : null;
  const categoryId: Id | null =
    scope === 'category' && typeof category === 'number' && pricing.categories.has(category)
      ? category
      : null;
  if (scope === 'type' && !serviceType) refuse('serviceType', 'Choose a service type.');
  if (scope !== 'type' && type != null)
    refuse('serviceType', 'A service type goes only with a rule for a type.');
  if (scope === 'category' && categoryId === null) refuse('categoryId', 'Choose a category.');
  if (scope !== 'category' && category != null)
    refuse('categoryId', 'A category goes only with a rule for a category.');
  if (problems.length > 0) return null;
  const twin = pricing.rules
    .list()
    .some(
      (rule) => rule.scope === scope && rule.serviceType === serviceType && rule.categoryId === categoryId,
    );
  if (twin) {
    refuse('scope', 'A rule for this already exists. Edit it instead.');
    return null;
  }
  return { scope, serviceType, categoryId };
}
