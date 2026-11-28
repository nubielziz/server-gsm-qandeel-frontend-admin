// QuickSearch: the bordered "Quick Search" box above the list: [Select Rank] [Search name, email, company or username] [Search]
// [Any status] [Any country]. The menus apply at once, together with the text typed so far; Search (or Enter) applies the text. Every
// choice goes to the address, so a link, a reload and Back keep it, and any change goes to page 1.
import { useState } from 'react';
import { CountryField, LegendBox, QuickSearchText, SelectField } from '@/components/ui';
import type { AccountCounts, Rank } from '../../types';
import type { GrantLock } from '../frame/useAccountGrants';
import { isListStatus } from '../../lib/status';
import type { ListAddress } from './listAddress';
import { countryChoices, rankChoices, rankOptions, statusOptions } from './menus';

export interface QuickSearchProps {
  address: ListAddress;
  /** Every rank (the box narrows them to the strip's population). Empty while they load or without `groups:read`. */
  ranks: readonly Rank[];
  /** The rank menu is locked with the reason when the role may not list the ranks. */
  rankLock: GrantLock;
  counts: AccountCounts | undefined;
  /** Goes to the list with these keys changed. */
  onApply: (patch: Partial<ListAddress>) => void;
}

/** The box. The text is a draft until Search or Enter; the address always holds what the list shows. */
export function QuickSearch({ address, ranks, rankLock, counts, onApply }: QuickSearchProps) {
  const [draft, setDraft] = useState(address.q);
  // The address moved under the box (Back, a link, Clear the search): the box shows what the list shows.
  const [seen, setSeen] = useState(address.q);
  if (address.q !== seen) {
    setSeen(address.q);
    setDraft(address.q);
  }
  const apply = (patch: Partial<ListAddress>) => onApply({ q: draft, ...patch });

  return (
    <LegendBox legend="Quick Search">
      <SelectField
        aria-label="Rank"
        options={rankOptions(rankChoices(ranks, address.chip), address.rank)}
        value={address.rank ?? ''}
        disabled={rankLock.disabled}
        title={rankLock.title}
        selectWrapClassName="w-full sm:w-auto sm:min-w-[11rem] sm:max-w-[24rem]"
        onChange={(event) => apply({ rank: event.target.value ? Number(event.target.value) : null })}
      />
      <QuickSearchText
        className="sm:min-w-[17rem]"
        value={draft}
        onChange={setDraft}
        onSearch={() => apply({})}
        placeholder="Search name, email, company or username"
      />
      <SelectField
        aria-label="Status"
        options={statusOptions(counts)}
        value={address.status ?? ''}
        selectWrapClassName="w-full sm:w-44"
        onChange={(event) => {
          const value = event.target.value;
          apply({ status: isListStatus(value) ? value : null });
        }}
      />
      <CountryField
        aria-label="Country"
        options={countryChoices(address.country)}
        value={address.country}
        selectWrapClassName="w-full sm:w-52"
        onValueChange={(country) => apply({ country })}
      />
    </LegendBox>
  );
}
