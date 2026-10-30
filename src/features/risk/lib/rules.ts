// The risk rules on screen: the demo's words for each rule, the hint that the hold line stays below the block line, the body
// of the save and where a server error belongs. Ports `tabRules`, `rk-rule` and `rk-val` of 54-p-risk.js and the rule table
// in `S.risk.rules` (09-b2c-data.js). The server owns the rules; these are display words and hints.
import { isApiError } from '@/lib/api';
import type { RiskRule, SaveRiskRulesBody } from '../types';

/** The rule ids the screen knows (assumed contract: the server uses these keys, MISMATCHES in HANDOFF). */
export const RULE_ID = {
  hold: 'reviewThreshold',
  block: 'blockThreshold',
} as const;

type RuleCopy = { label: string; hint: string; unit?: string; sameAsSettings?: boolean };

/** The demo's label, hint and unit for each rule, keyed by rule id. */
const RULE_COPY: Readonly<Record<string, RuleCopy>> = {
  blockBlacklistedImei: {
    label: 'Block blacklisted IMEIs before payment',
    hint: 'Looked up in the GSMA blacklist at checkout. The customer sees why and is not charged.',
  },
  [RULE_ID.hold]: {
    label: 'Hold orders scoring at least',
    hint: 'Held orders wait in the risk queue and are not sent to a supplier.',
    unit: 'points',
  },
  [RULE_ID.block]: {
    label: 'Block orders scoring at least',
    hint: 'The payment is cancelled automatically.',
    unit: 'points',
  },
  maxOrdersPerEmail: {
    label: 'Maximum orders per email in 24 hours',
    hint: 'Stops card testing and scripted abuse.',
    unit: 'orders',
  },
  reviewFirstOrderAbove: {
    label: 'Hold the first order of a new customer above',
    hint: 'First orders above this amount are held for a person to look at.',
    unit: 'USD',
  },
  require3ds: {
    label: 'Require 3D Secure on card payments',
    hint: 'Moves chargeback liability to the card issuer for most fraud disputes.',
    sameAsSettings: true,
  },
  reviewIpCountryMismatch: {
    label: 'Hold when the IP country differs from the card country',
    hint: 'Adds 25 points to the score.',
  },
  blockDisposableEmail: {
    label: 'Block disposable email domains',
    hint: 'Temporary mailboxes cannot receive the result reliably.',
  },
};

/** What to print for a rule: the server's wording when it sent some, else the demo's, else the id. */
export function ruleText(rule: RiskRule): {
  label: string;
  hint: string;
  unit: string;
  sameAsSettings: boolean;
} {
  const copy = Object.hasOwn(RULE_COPY, rule.id) ? RULE_COPY[rule.id] : undefined;
  return {
    label: rule.label ?? copy?.label ?? rule.id,
    hint: rule.hint ?? copy?.hint ?? '',
    unit: rule.unit ?? copy?.unit ?? '',
    sameAsSettings: copy?.sameAsSettings ?? false,
  };
}

/** A whole number, 0 or more, or null when the text is anything else (the demo parsed with `parseInt`). */
export function parseRuleValue(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

const valueOf = (rules: readonly RiskRule[], id: string): number | null =>
  rules.find((rule) => rule.id === id)?.value ?? null;

/**
 * The message under a number field when the text cannot be saved, else null. Besides "Enter a whole number" it keeps the
 * hold line below the block line, in the demo's words. It is a hint that saves a round trip: the server checks it too.
 */
export function ruleValueHint(rules: readonly RiskRule[], id: string, text: string): string | null {
  const value = parseRuleValue(text);
  if (value === null) return 'Enter a whole number.';
  const block = valueOf(rules, RULE_ID.block);
  const hold = valueOf(rules, RULE_ID.hold);
  if (id === RULE_ID.hold && block !== null && value >= block) {
    return `The hold line must be below the block line. Block starts at ${block}.`;
  }
  if (id === RULE_ID.block && hold !== null && value <= hold) {
    return `The block line must be above the hold line. Hold starts at ${hold}.`;
  }
  return null;
}

/** One change to a rule: its switch, its number, or both. */
export type RuleChange = { id: string; on?: boolean; value?: number };

/** The whole set with one change applied: `PUT` replaces every rule, so the rest go back unchanged. */
export function rulesBody(rules: readonly RiskRule[], change: RuleChange): SaveRiskRulesBody {
  return {
    rules: rules.map((rule) =>
      rule.id === change.id
        ? { id: rule.id, on: change.on ?? rule.on, value: change.value ?? rule.value }
        : { id: rule.id, on: rule.on, value: rule.value },
    ),
  };
}

/** The same set as the saved rules, for the cache while the server's answer is not back (or sends no body). */
export function applyChange(rules: readonly RiskRule[], change: RuleChange): RiskRule[] {
  return rules.map((rule) =>
    rule.id === change.id
      ? { ...rule, on: change.on ?? rule.on, value: change.value ?? rule.value }
      : { ...rule },
  );
}

/** The hold and block lines for the "How scoring works" bar, or null when either is missing. */
export function scoringBands(rules: readonly RiskRule[]): { hold: number; block: number } | null {
  const hold = valueOf(rules, RULE_ID.hold);
  const block = valueOf(rules, RULE_ID.block);
  return hold === null || block === null ? null : { hold, block };
}

// The rule a server field name points at: `blockThreshold`, `rules.blockThreshold.value`, or `rules.3.value` (an index).
function ruleIdOf(field: string, rules: readonly RiskRule[]): string | undefined {
  const parts = field.split('.');
  for (const [index, part] of parts.entries()) {
    if (rules.some((rule) => rule.id === part)) return part;
    if (/^\d+$/.test(part) && parts[index - 1] === 'rules') return rules[Number(part)]?.id;
  }
  return undefined;
}

/**
 * Splits a failed save into the messages that belong under a rule's field (by rule id) and the rest, which the page shows
 * in one line above the list. An error that is not from the API has no field messages.
 */
export function ruleErrors(
  error: unknown,
  rules: readonly RiskRule[],
): { byRule: Record<string, string>; rest: string[] } {
  if (!isApiError(error)) return { byRule: {}, rest: [] };
  const byRule: Record<string, string> = {};
  const rest = [...error.formErrors];
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const id = ruleIdOf(field, rules);
    if (id) byRule[id] = messages.join(' ');
    else rest.push(...messages.map((message) => `${field}: ${message}`));
  }
  return { byRule, rest };
}
