// Text of an alert or a rule in the Alerts & incidents tab: the condition as one line ("23.4 % > 20 % for 3m"), the
// subject an alert is about, and the channels. Formatting only: nothing here compares a value with a threshold.
import { NO_DATA, formatDuration, formatValue, plainNumber } from '../../lib';
import type { AlertChannel, AlertEvent, AlertRuleRef, MeasureUnit } from '../../types';

// The sign printed for each comparator of a rule.
const SYMBOL: Record<string, string> = { gt: '>', gte: '≥', lt: '<', lte: '≤' };

/** The sign of a comparator: `gt` is ">". A comparator we do not know (the contract is assumed) prints as the server sent it. */
export function comparatorSymbol(comparator: string): string {
  return Object.hasOwn(SYMBOL, comparator) ? SYMBOL[comparator] : comparator;
}

/**
 * A number in the rule's unit ("20 %", "3m 12s", "1.5 s"). A rule without a unit (a supplier balance) prints a plain
 * number: the console never invents a unit the server did not send. A missing value prints "No data".
 */
export function printInUnit(value: number | null | undefined, unit: MeasureUnit | null): string {
  if (unit) return formatValue(value, unit);
  return value == null || !Number.isFinite(value) ? NO_DATA : plainNumber(value, 2);
}

/** The window of a rule in words: 180 -> "3m", 90 -> "1m 30s", 3600 -> "1h". */
export function windowText(seconds: number): string {
  return formatDuration(seconds);
}

type RuleLimit = Pick<AlertRuleRef, 'comparator' | 'threshold' | 'windowSeconds' | 'unit'>;

/** The limit of a rule without a value: "> 20 % for 3m". */
export function limitText(rule: RuleLimit): string {
  return `${comparatorSymbol(rule.comparator)} ${printInUnit(rule.threshold, rule.unit)} for ${windowText(rule.windowSeconds)}`;
}

/**
 * What an alert measured against its rule, as one line: "23.4 % > 20 % for 3m". The value is the alert's, the
 * comparator, threshold, window and unit are its rule's.
 */
export function conditionText(value: number | null, rule: RuleLimit): string {
  return `${printInUnit(value, rule.unit)} ${limitText(rule)}`;
}

/** The name of a kind of subject, for the small line under it. The platform itself has no kind line. */
const SUBJECT_KIND: Record<string, string> = {
  supplier: 'Supplier',
  queue: 'Queue',
  gateway: 'Gateway',
  ledger_account: 'Ledger account',
  client: 'Merchant',
};

export interface SubjectText {
  /** What the alert is about: a supplier's name, a queue, an account. */
  name: string;
  /** What kind of thing it is, or null for the platform as a whole. */
  kind: string | null;
  /** True when the name is a code (a queue name): it prints in mono. */
  code: boolean;
}

/** "Sentence case" text of a raw type such as `ledger_account`. */
function humanize(type: string): string {
  const words = type.replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Unknown';
}

/** The subject of an alert in words. A system alert has no label and is about the whole platform. */
export function subjectText(
  alert: Pick<AlertEvent, 'subjectType' | 'subjectId' | 'subjectLabel'>,
): SubjectText {
  const system = alert.subjectType === 'system';
  const name = alert.subjectLabel ?? (system ? 'Whole platform' : `#${alert.subjectId}`);
  const known = Object.hasOwn(SUBJECT_KIND, alert.subjectType);
  const kind = system ? null : known ? SUBJECT_KIND[alert.subjectType] : humanize(alert.subjectType);
  return { name, kind, code: alert.subjectType === 'queue' };
}

/** Who acknowledged the alert: their name, "Unknown" when the alert was acknowledged but the staff member is gone, null when nobody did. */
export function acknowledgedBy(alert: Pick<AlertEvent, 'acknowledgedBy' | 'acknowledgedAt'>): string | null {
  return alert.acknowledgedBy?.name ?? (alert.acknowledgedAt ? 'Unknown' : null);
}

// The word printed for each channel of a rule.
const CHANNEL_LABEL: Record<AlertChannel, string> = { telegram: 'Telegram', email: 'Email' };

/** The word of one channel. A channel we do not know prints as the server sent it. */
export function channelLabel(channel: string): string {
  return Object.hasOwn(CHANNEL_LABEL, channel) ? CHANNEL_LABEL[channel as AlertChannel] : channel;
}

/** "Telegram, Email". */
export function channelsText(channels: readonly string[]): string {
  return channels.map(channelLabel).join(', ');
}
