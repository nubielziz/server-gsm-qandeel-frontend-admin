// Turns the Retail pricing mock rows into what the routes send: a rule with the server's words for it (`label`) and its category's
// name, and a price change joined with its service and rule. The label is the figures as typed, put into a sentence: the mock works
// out no price (M92).
import { TYPE_LABEL } from '@/lib/serviceTypes';
import { moneyInput } from '../lib/money';
import { percentInput } from '../lib/retailRuleForm';
import type { RetailPriceChange, RetailPriceRule, RetailRounding } from '../types';
import type { MockRetailChange, MockRetailRule, Stores } from './types';

const ROUNDING_WORDS: Record<RetailRounding, string> = {
  cent: '',
  'step_0.05': ', up to 5 cents',
  'step_0.10': ', up to 10 cents',
  ends_99: ', ends in .99',
};

/** The server's words for a rule: "Every service +25%, ends in .99", "IMEI +30%", "Carrier unlock +20% +$0.50, up to 5 cents". */
export function ruleLabel(stores: Stores, rule: MockRetailRule): string {
  const target =
    rule.scope === 'global'
      ? 'Every service'
      : rule.scope === 'type' && rule.serviceType
        ? TYPE_LABEL[rule.serviceType]
        : (stores.pricing.categories.get(rule.categoryId ?? 0) ?? `Category ${rule.categoryId}`);
  const fixed = Number(rule.fixed) === 0 ? '' : ` +$${moneyInput(rule.fixed)}`;
  return `${target} +${percentInput(rule.percent)}%${fixed}${ROUNDING_WORDS[rule.rounding]}`;
}

/** One rule as `GET /admin/retail-price-rules` sends it. */
export function toRule(stores: Stores, rule: MockRetailRule): RetailPriceRule {
  return {
    ...rule,
    categoryName: rule.categoryId === null ? null : (stores.pricing.categories.get(rule.categoryId) ?? null),
    label: ruleLabel(stores, rule),
  };
}

/** The rule that prices a service: its category's, else its type's, else the global one (active rules only), or undefined. */
export function ruleFor(stores: Stores, serviceId: number): MockRetailRule | undefined {
  const service = stores.services.get(serviceId);
  if (!service) return undefined;
  const active = stores.pricing.rules.list().filter((rule) => rule.isActive);
  return (
    active.find((rule) => rule.scope === 'category' && rule.categoryId === service.categoryId) ??
    active.find((rule) => rule.scope === 'type' && rule.serviceType === service.type) ??
    active.find((rule) => rule.scope === 'global')
  );
}

/** One price change as `GET /admin/retail-price-changes` sends it. */
export function toChange(stores: Stores, row: MockRetailChange): RetailPriceChange {
  const service = stores.services.get(row.serviceId);
  const rule = row.ruleId === null ? undefined : stores.pricing.rules.find(row.ruleId);
  return {
    id: row.id,
    service: {
      id: row.serviceId,
      name: service?.name ?? `Service ${row.serviceId}`,
      code: service?.code ?? '',
    },
    kind: row.kind,
    reason: row.reason,
    oldPrice: row.oldPrice,
    newPrice: row.newPrice,
    oldCost: row.oldCost,
    newCost: row.newCost,
    rule:
      row.ruleId === null
        ? null
        : { id: row.ruleId, label: rule ? ruleLabel(stores, rule) : 'A deleted rule' },
    waiting: row.waiting,
    resolution: row.resolution,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
    createdAt: row.createdAt,
  };
}
