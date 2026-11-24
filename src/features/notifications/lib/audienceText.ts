// The audience and the live count in words: "All active staff, active merchants and customers with an account; plus 3 people" and "1,204 customers did
// not agree to marketing". Names of roles and groups come from the pickers when they are known, else the number is said.
import { num } from '@/lib/format';
import type { AudiencePreview, AudienceSpec, CampaignChannel, Campaign } from '../types';

/** `1 person`, `3 people`. */
export const plural = (count: number, one: string, many: string) =>
  `${num(count)} ${count === 1 ? one : many}`;

/** `has` for one, `have` for more: "1 merchant has", "3 merchants have". */
const has = (count: number) => (count === 1 ? 'has' : 'have');

/** "A", "A and B", "A, B and C". */
export function sentenceList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Names of roles and client groups by id, for the sentence; a missing name falls back to a count. */
export type AudienceNames = { roles?: ReadonlyMap<number, string>; groups?: ReadonlyMap<number, string> };

const named = (
  ids: readonly number[],
  names: ReadonlyMap<number, string> | undefined,
  noun: string,
): string => {
  const found = ids.map((id) => names?.get(id)).filter((name): name is string => Boolean(name));
  return found.length === ids.length ? sentenceList(found) : plural(ids.length, noun, `${noun}s`);
};

/** One line per targeted group: `{ label: 'Merchants', text: 'Active merchants in Gold, from JO and SA' }`. */
export function audienceLines(
  spec: AudienceSpec,
  names: AudienceNames = {},
): { label: string; text: string }[] {
  const lines: { label: string; text: string }[] = [];
  if (spec.staff) {
    const roles = spec.staff.roleIds;
    lines.push({
      label: 'Staff',
      text: roles?.length
        ? `Active staff with the role ${named(roles, names.roles, 'role')}`
        : 'All active staff',
    });
  }
  if (spec.merchants) {
    const { statuses, groupIds, countries } = spec.merchants;
    const both = statuses?.includes('pending');
    const only =
      statuses && !statuses.includes('active')
        ? 'Pending merchants'
        : both
          ? 'Active and pending merchants'
          : 'Active merchants';
    const parts = [only];
    if (groupIds?.length) parts.push(`in ${named(groupIds, names.groups, 'group')}`);
    if (countries?.length) parts.push(`from ${sentenceList(countries)}`);
    lines.push({ label: 'Merchants', text: parts.join(' ') });
  }
  if (spec.customers) {
    const { hasAccount, countries } = spec.customers;
    const base =
      hasAccount === true
        ? 'Customers with an account'
        : hasAccount === false
          ? 'Guest customers'
          : 'All active customers';
    const parts = [base];
    if (countries?.length) parts.push(`from ${sentenceList(countries)}`);
    lines.push({ label: 'Customers', text: parts.join(' ') });
  }
  if (spec.include?.length)
    lines.push({ label: 'Added', text: plural(spec.include.length, 'person', 'people') });
  if (spec.exclude?.length)
    lines.push({ label: 'Left out', text: plural(spec.exclude.length, 'person', 'people') });
  return lines;
}

/** The audience in one sentence, for a dialog or a tooltip. */
export function audienceSummary(spec: AudienceSpec, names: AudienceNames = {}): string {
  const lines = audienceLines(spec, names);
  return lines.length === 0
    ? 'Nobody chosen yet'
    : lines.map((line) => `${line.label}: ${line.text}`).join('; ');
}

/** Who is left out of the count and why, one sentence each, only for the reasons that apply. */
export function exclusionLines(excluded: AudiencePreview['excluded']): string[] {
  const lines: string[] = [];
  if (excluded.noConsent > 0)
    lines.push(`${plural(excluded.noConsent, 'customer', 'customers')} did not agree to marketing`);
  if (excluded.optedOut > 0)
    lines.push(
      `${plural(excluded.optedOut, 'person', 'people')} ${excluded.optedOut === 1 ? 'has' : 'have'} switched announcement emails off`,
    );
  if (excluded.noAccount > 0)
    lines.push(
      `${plural(excluded.noAccount, 'customer', 'customers')} ${has(excluded.noAccount)} no account, so no inbox`,
    );
  return lines;
}

/** "6 staff, 402 merchants and 800 customers": the people by kind, only the kinds that are not empty. */
export function byTypeText(byType: AudiencePreview['byType']): string {
  const parts = [
    byType.staff > 0 && `${num(byType.staff)} staff`,
    byType.client > 0 && plural(byType.client, 'merchant', 'merchants'),
    byType.customer > 0 && plural(byType.customer, 'customer', 'customers'),
  ].filter((part): part is string => Boolean(part));
  return sentenceList(parts);
}

/** "1,190 by email and 1,208 in the app": the messages by channel, for the channels that were chosen. */
export function byChannelText(
  byChannel: AudiencePreview['byChannel'],
  channels: readonly CampaignChannel[],
): string {
  const parts = [
    channels.includes('in_app') && `${num(byChannel.inApp)} in the app`,
    channels.includes('email') && `${num(byChannel.email)} by email`,
  ].filter((part): part is string => Boolean(part));
  return sentenceList(parts);
}

/** The planned message counts of a campaign as short text for a stat cell ("12 in-app, 10 email"). */
export function plannedText(planned: Campaign['planned']): string {
  const parts = [
    planned.inApp > 0 && `${num(planned.inApp)} in-app`,
    planned.email > 0 && `${num(planned.email)} email`,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(', ') : 'No messages planned';
}

/** Why the fan-out made fewer messages than people: one sentence per reason that applies. */
export function skippedLines(skipped: { optedOut: number; noAccount: number }): string[] {
  const lines: string[] = [];
  if (skipped.optedOut > 0)
    lines.push(
      `${plural(skipped.optedOut, 'person', 'people')} ${skipped.optedOut === 1 ? 'has' : 'have'} switched announcement emails off`,
    );
  if (skipped.noAccount > 0)
    lines.push(
      `${plural(skipped.noAccount, 'customer', 'customers')} ${has(skipped.noAccount)} no account, so no inbox item`,
    );
  return lines;
}
