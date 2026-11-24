// The options of the menus in the Quick Search box above the list: the ranks of the strip's population, the statuses with their counts and the
// countries. Pure, so each rule is a test row.
import type { SelectOption } from '@/components/ui';
import { num } from '@/lib/format';
import { ranksOfKind } from '../../lib/ranks';
import type { AccountCounts, Rank } from '../../types';
import { COUNTRIES } from '../shared/countries';
import type { ListAddress } from './listAddress';

/**
 * The ranks the rank menu offers for the strip's population, in the server's rank order: every rank for All accounts (the retail rank
 * first), the retail rank for Retail and Guests, the merchant ranks for Merchants.
 */
export function rankChoices(ranks: readonly Rank[], chip: ListAddress['chip']): Rank[] {
  const retail = ranksOfKind(ranks, 'retail');
  const merchant = ranksOfKind(ranks, 'merchant');
  if (chip === 'merchants') return merchant;
  if (chip === 'retail' || chip === 'guests') return retail;
  return [...retail, ...merchant];
}

/**
 * The rank menu: "All ranks", then each rank with its number of accounts ("VIP (2)"). A rank from the address that is not in the list
 * (a rank of another population, or the list still loading) still shows as "Rank #<id>", so a filter is never on out of sight.
 */
export function rankOptions(
  choices: readonly Rank[],
  selected: number | null,
  counted = true,
): SelectOption[] {
  const options: SelectOption[] = [
    { value: '', label: 'All ranks' },
    ...choices.map((rank) => ({
      value: rank.id,
      label:
        counted && rank.accountCount !== undefined ? `${rank.name} (${num(rank.accountCount)})` : rank.name,
    })),
  ];
  if (selected !== null && !choices.some((rank) => rank.id === selected)) {
    options.push({ value: selected, label: `Rank #${selected}` });
  }
  return options;
}

// "Suspended (3)": the word and the number the counts route gave; no number while the counts are unknown.
const withCount = (word: string, count: number | undefined) =>
  count === undefined ? word : `${word} (${num(count)})`;

/** The status menu: "Any status", then each status and "Invitation pending"; the ones that are exceptions carry their number of accounts. */
export function statusOptions(counts: AccountCounts | undefined): SelectOption[] {
  return [
    { value: '', label: 'Any status' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: withCount('Suspended', counts?.suspended) },
    { value: 'blocked', label: withCount('Blocked', counts?.blocked) },
    { value: 'anonymized', label: withCount('Anonymized', counts?.anonymized) },
    { value: 'invitation', label: withCount('Invitation pending', counts?.invitationPending) },
  ];
}

/** The country menu: "Any country", then the storefront countries by name. A code from the address the list lacks shows as "Country XX". */
export function countryChoices(selected: string): SelectOption[] {
  const options: SelectOption[] = [
    { value: '', label: 'Any country' },
    ...COUNTRIES.map((country) => ({ value: country.code, label: country.name })),
  ];
  if (selected && !COUNTRIES.some((country) => country.code === selected)) {
    options.push({ value: selected, label: `Country ${selected}` });
  }
  return options;
}
