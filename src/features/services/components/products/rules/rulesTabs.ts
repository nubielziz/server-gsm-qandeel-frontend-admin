// The sub-views of the Price Rules view (`?view=rules&tab=…`) with the permissions each one needs: the merchant price rules, the shop price
// rules (with the proposals that wait) and the price check (what a merchant pays for a service, and why). The first one the role may open is
// the default. Hiding a tab is a hint; the server still checks each call.
import type { RulesTabId } from '../../../lib/productsPath';

/** One sub-view: `permissions` are all needed to open it (the price check reads prices and must list services to choose from). */
export type RulesTabSpec = { id: RulesTabId; label: string; permissions: readonly string[] };

export const RULES_TAB_SPECS: readonly RulesTabSpec[] = [
  { id: 'merchant', label: 'Merchant price rules', permissions: ['pricing:read'] },
  { id: 'shop', label: 'Shop price rules', permissions: ['pricing:read'] },
  { id: 'check', label: 'Price check', permissions: ['pricing:read', 'catalog:read'] },
];
