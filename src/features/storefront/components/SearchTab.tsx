// SearchTab: the "Search" tab (new, backend feature 29): the tools that tune the shop's search box: synonyms, pinned results, the
// report of what visitors searched, and the state of the index with its Rebuild button. The open section lives in the address
// (`?tab=search&section=pins`). Needs storefront:read; each action says which write permission it needs.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { Tabs, type TabItem } from '@/components/ui';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { IndexStatusPanel } from './search/IndexStatusPanel';
import { PinsPanel } from './search/PinsPanel';
import { SearchReportPanel } from './search/SearchReportPanel';
import { SynonymsPanel } from './search/SynonymsPanel';

type Section = 'synonyms' | 'pins' | 'report' | 'index';

const SECTIONS: readonly TabItem<Section>[] = [
  { value: 'synonyms', label: 'Synonyms' },
  { value: 'pins', label: 'Pinned results' },
  { value: 'report', label: 'Report' },
  { value: 'index', label: 'Index' },
];

/** The section the address names; anything else is the first. */
function sectionOf(raw: string | null): Section {
  return SECTIONS.find((item) => item.value === raw)?.value ?? 'synonyms';
}

/** The sub-navigation and the open section. */
export function SearchTab({ grants }: { grants: StorefrontGrants }) {
  const [params, setParams] = useSearchParams();
  const section = sectionOf(params.get('section'));
  // A new section starts clean: the search text and page of one list mean nothing to another.
  const open = useCallback(
    (next: Section) => setParams(next === 'synonyms' ? { tab: 'search' } : { tab: 'search', section: next }),
    [setParams],
  );
  const current = SECTIONS.find((item) => item.value === section);

  return (
    <>
      <div className="mb-4">
        <Tabs items={SECTIONS} value={section} onChange={open} label="Search tools" />
      </div>
      <div role="tabpanel" aria-label={current?.label}>
        {section === 'synonyms' && <SynonymsPanel grants={grants} />}
        {section === 'pins' && <PinsPanel grants={grants} />}
        {section === 'report' && <SearchReportPanel grants={grants} />}
        {section === 'index' && <IndexStatusPanel grants={grants} />}
      </div>
    </>
  );
}
