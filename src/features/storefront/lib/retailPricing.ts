// Words and lists of the "Retail pricing" tab: what a rule covers, its rounding, the badge of each price change and the
// sentences for what a preview says. Every figure is the server's; this file only chooses words for the server's names.
import type { BadgeTone, IconName, SelectOption } from '@/components/ui';
import { TYPE_LABEL, type ServiceType } from '@/features/orders';
import { num } from '@/lib/format';
import type {
  RetailChangeKind,
  RetailChangeReason,
  RetailChangeResolution,
  RetailPriceChange,
  RetailPriceRule,
  RetailRounding,
  RetailRulePreview,
  RetailRuleScope,
} from '../types';

/** The four kinds of service, in the order the console lists them everywhere. */
export const SERVICE_TYPES: readonly ServiceType[] = ['imei', 'server', 'remote', 'file'];

/** What a rule can cover, for the dialog's menu. */
export const SCOPE_OPTIONS: readonly (SelectOption & { value: RetailRuleScope })[] = [
  { value: 'global', label: 'Every service' },
  { value: 'type', label: 'A service type' },
  { value: 'category', label: 'A category' },
];

/** The service type menu of the rule form. */
export const TYPE_OPTIONS: readonly SelectOption[] = SERVICE_TYPES.map((type) => ({
  value: type,
  label: TYPE_LABEL[type],
}));

/** How a price is rounded up, for the dialog's menu. The server always rounds up, and only from "Round prices from". */
export const ROUNDING_OPTIONS: readonly (SelectOption & { value: RetailRounding })[] = [
  { value: 'cent', label: 'Whole cents' },
  { value: 'step_0.05', label: 'Up to the next 5 cents' },
  { value: 'step_0.10', label: 'Up to the next 10 cents' },
  { value: 'ends_99', label: 'Ends in .99' },
];

/** The target of a rule in words, for a button's accessible name and a dialog: "every service", "IMEI services" or a category. */
export function ruleTargetName(
  rule: Pick<RetailPriceRule, 'scope' | 'serviceType' | 'categoryName' | 'categoryId'>,
): string {
  if (rule.scope === 'global') return 'every service';
  if (rule.scope === 'type')
    return rule.serviceType ? `${TYPE_LABEL[rule.serviceType]} services` : 'a service type';
  return rule.categoryName ?? `category ${rule.categoryId ?? '?'}`;
}

/** The two views of the price changes list. */
export type ChangesShow = 'waiting' | 'all';

/** How a price change shows in the table: a badge with an icon and a word, and a short line that says why. */
export type ChangeWords = { tone: BadgeTone; icon: IconName; label: string; note: string | null };

const RESOLUTION_WORDS: Record<RetailChangeResolution, { label: string; icon: IconName }> = {
  applied: { label: 'Approved', icon: 'checkCircle' },
  kept: { label: 'Kept the price', icon: 'check' },
  superseded: { label: 'No longer needed', icon: 'ban' },
};

const REASON_NOTE: Record<RetailChangeReason, string | null> = {
  cost_changed: null,
  rule_changed: null,
  floor_changed: null,
  cost_jump: 'The cost moved more than the rule allows by itself.',
  no_cost: 'The service has no cost now.',
  changed_elsewhere: 'The price was changed outside the rule.',
};

const KIND_WORDS: Record<
  Exclude<RetailChangeKind, 'proposed'>,
  Partial<Record<RetailChangeReason, { tone: BadgeTone; icon: IconName; label: string }>> & {
    fallback: { tone: BadgeTone; icon: IconName; label: string };
  }
> = {
  followed: {
    cost_changed: { tone: 'good', icon: 'checkCircle', label: 'Followed the cost' },
    rule_changed: { tone: 'neutral', icon: 'sliders', label: 'Rule changed' },
    floor_changed: { tone: 'neutral', icon: 'scale', label: 'Floor changed' },
    fallback: { tone: 'good', icon: 'checkCircle', label: 'Followed the cost' },
  },
  detached: { fallback: { tone: 'warn', icon: 'alert', label: 'Stopped following' } },
};

/**
 * The badge words of one price change: a proposal that waits is "Waiting for approval", a closed one says how it was closed,
 * a followed price says what moved it and a detached one says it stopped following.
 */
export function changeWords(
  change: Pick<RetailPriceChange, 'kind' | 'reason' | 'waiting' | 'resolution'>,
): ChangeWords {
  const note = REASON_NOTE[change.reason];
  if (change.kind === 'proposed') {
    if (change.waiting || !change.resolution) {
      return { tone: 'accent', icon: 'clock', label: 'Waiting for approval', note };
    }
    const { label, icon } = RESOLUTION_WORDS[change.resolution];
    return { tone: 'neutral', icon, label, note };
  }
  const words = KIND_WORDS[change.kind];
  return { ...(words[change.reason] ?? words.fallback), note };
}

/** The sentence for an id the server skipped when resolving proposals. An unknown reason is shown as the server sent it. */
const SKIP_REASON: Record<string, string> = {
  changed: 'the price moved, so the new figure is shown and needs your approval again',
  no_cost: 'the service has no cost, so a rule cannot price it',
  no_rule: 'no pricing rule covers it now',
  not_waiting: 'it was already resolved',
};

/** One skipped id in words, with the service name when the table still holds it. */
export function skippedText(skip: { id: number; reason: string }, name: string | undefined): string {
  return `${name ?? `Change ${skip.id}`}: ${SKIP_REASON[skip.reason] ?? skip.reason}.`;
}

/** "3 of 12 prices change: 2 up, 1 down", from the server's counts. */
export function previewSummary(
  preview: Pick<RetailRulePreview, 'changes' | 'following' | 'raised' | 'lowered'>,
): string {
  const prices = preview.following === 1 ? 'price' : 'prices';
  return `${num(preview.changes)} of ${num(preview.following)} ${prices} change: ${num(preview.raised)} up, ${num(preview.lowered)} down`;
}

/** The note for services a preview leaves with no rule: they keep the price they have. */
export function noRuleText(count: number): string {
  return `${num(count)} ${count === 1 ? 'service has' : 'services have'} no rule left and ${count === 1 ? 'keeps' : 'keep'} the current price.`;
}

/** The note for prices a preview holds at their floor. */
export function atFloorText(count: number): string {
  return `${num(count)} ${count === 1 ? 'price is' : 'prices are'} held at their floor: the margin is under what the floor allows.`;
}
