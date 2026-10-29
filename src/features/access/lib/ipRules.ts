// Labels, durations and small helpers for IP rules. Ports IP_SCOPE, IP_SCOPE_TAG, IP_DURATIONS, durText and ipLive of
// 14-state-access.js, ALLOW_DURATIONS and BLOCK_SCOPE_OPTS of 56-p-access.js, and the "Lasts" text IP_LEFT.
import type { IpRule, IpRuleKind, IpScope } from '../types';
import { timeValue, type SortValues } from './sort';

/** One choice of a select, in the shape the kit's SelectField takes. */
type Option = { value: string; label: string };

/** Who a rule applies to, in sentence form (toasts, the unblock dialog). */
export const IP_SCOPE: Record<IpScope, string> = {
  store: 'Customers (storefront)',
  api: 'Merchants (API)',
  admin: 'Admins (console)',
  all: 'Everywhere',
};

/** Who a rule applies to, as the short tag in the blocked table and the tester. */
export const IP_SCOPE_TAG: Record<IpScope, string> = {
  store: 'Storefront',
  api: 'Merchant API',
  admin: 'Admin console',
  all: 'Everywhere',
};

/** "Block for" choices; the value is a number of hours, `0` meaning until someone removes the block. */
export const IP_DURATIONS: readonly Option[] = [
  { value: '0', label: 'Until I remove it' },
  { value: '1', label: '1 hour' },
  { value: '24', label: '24 hours' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
];

/** "For how long" choices of an allowed address (no one-hour option). */
export const ALLOW_DURATIONS: readonly Option[] = IP_DURATIONS.filter((option) => option.value !== '1');

/** "Who it applies to" choices of the block dialog. */
export const BLOCK_SCOPE_OPTS: readonly Option[] = [
  { value: 'store', label: 'Customers on the storefront' },
  { value: 'api', label: 'Merchants using the API' },
  { value: 'admin', label: 'Admins on the console' },
  { value: 'all', label: 'Everywhere' },
];

/** The scopes the address tester can try (a rule may cover `all`, but a visitor always comes to one place). */
export const TEST_SCOPE_OPTS: readonly Option[] = [
  { value: 'admin', label: 'Admin console' },
  { value: 'store', label: 'Storefront' },
  { value: 'api', label: 'Merchant API' },
];

const HOUR_MS = 3_600_000;
const NAMED_DURATIONS: Record<number, string> = {
  1: '1 hour',
  24: '24 hours',
  168: '7 days',
  720: '30 days',
};

/** A duration in hours as words: 24 is "24 hours", 168 is "7 days", 5 is "5 hours". */
export function durText(hours: number): string {
  return NAMED_DURATIONS[hours] ?? `${hours} hours`;
}

/** The moment a rule created now for `hours` lapses, as an ISO string; undefined for `0` (until removed). */
export function expiresAtFor(hours: number, now: number = Date.now()): string | undefined {
  return hours > 0 ? new Date(now + hours * HOUR_MS).toISOString() : undefined;
}

/** A rule is live until its expiry; one that never expires is always live. */
export function isLive(rule: Pick<IpRule, 'expiresAt'>, now: number = Date.now()): boolean {
  return !rule.expiresAt || Date.parse(rule.expiresAt) > now;
}

/** The live rules of one kind. A temporary rule that has lapsed is hidden even if the server still lists it. */
export function liveRules(rules: readonly IpRule[], kind: IpRuleKind, now: number = Date.now()): IpRule[] {
  return rules.filter((rule) => rule.kind === kind && isLive(rule, now));
}

/** "5m", "2h 3m", "3d 4h": how long is left, in the two largest units (the demo's ageText). */
export function ageText(ms: number): string {
  const gap = ' ';
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${minutes % 60 ? `${gap}${minutes % 60}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? `${gap}${hours % 24}h` : ''}`;
}

/** The "Lasts" cell: "in 2d 3h" for a temporary rule, null for one that lasts until it is removed. */
export function leftText(rule: Pick<IpRule, 'expiresAt'>, now: number = Date.now()): string | null {
  return rule.expiresAt ? `in ${ageText(Date.parse(rule.expiresAt) - now)}` : null;
}

/** A range has a slash ("203.0.113.0/24"); a single address does not. */
export function isRange(cidr: string): boolean {
  return cidr.includes('/');
}

/** What each sortable column of the allowed and blocked tables compares (the demo's `val` functions). */
export const IP_RULE_SORT: SortValues<IpRule> = {
  cidr: (rule) => rule.cidr,
  scope: (rule) => rule.scope,
  how: (rule) => rule.source,
  added: (rule) => timeValue(rule.createdAt),
  // A rule that never expires sorts after every one that does.
  lasts: (rule) => (rule.expiresAt ? timeValue(rule.expiresAt) : Number.MAX_SAFE_INTEGER),
  hits: (rule) => rule.hitCount,
};
