// GroupSearch: the "Quick Search" box above the Group list: one text box and its Search button, in the same bordered box as the All view's.
// The text is a draft until Search or Enter; the address always holds what the list shows.
import { useState } from 'react';
import { LegendBox, QuickSearchText } from '@/components/ui';

export interface GroupSearchProps {
  /** The search the address holds. */
  q: string;
  /** Search or Enter: the text to look for ('' clears the search). */
  onSearch: (text: string) => void;
}

/** The box. When the address moves under it (Back, Clear search, a group just added), it shows what the list shows. */
export function GroupSearch({ q, onSearch }: GroupSearchProps) {
  const [draft, setDraft] = useState(q);
  const [seen, setSeen] = useState(q);
  if (q !== seen) {
    setSeen(q);
    setDraft(q);
  }
  return (
    <LegendBox legend="Quick Search">
      <QuickSearchText
        className="sm:min-w-[17rem]"
        value={draft}
        onChange={setDraft}
        onSearch={() => onSearch(draft)}
        placeholder="Search groups by name"
      />
    </LegendBox>
  );
}
