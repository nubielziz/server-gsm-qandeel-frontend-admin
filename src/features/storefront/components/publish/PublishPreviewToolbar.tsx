// PublishPreviewToolbar: the search box, the status chips (All, Ready, Needs a look, Cannot publish, Left out), the Flag and Brand
// kind selects and the live count above the preview table. The search text and filters live in the address (`useListView`); the
// server filters and counts. The chips carry the run's own counts.
import { SegmentedControl, SelectField } from '@/components/ui';
import { BRAND_KIND_OPTIONS, chipOf, chipsOf, flagOptions, type StatusChip } from '../../lib/publishPreview';
import type { ListView } from '../../lib/views';
import type { PublishRun } from '../../types';
import { ListToolbar } from '../ListToolbar';

export interface PublishPreviewToolbarProps {
  run: PublishRun;
  view: ListView;
  /** How many rows match, from the server. */
  total: number | undefined;
  filtered: boolean;
  onQuery: (q: string) => void;
  onChip: (chip: StatusChip) => void;
  onFilter: (name: string, value: string) => void;
  onClear: () => void;
}

/** One toolbar; a change goes back to page 1 (the hook does it). */
export function PublishPreviewToolbar({
  run,
  view,
  total,
  filtered,
  onQuery,
  onChip,
  onFilter,
  onClear,
}: PublishPreviewToolbarProps) {
  return (
    <ListToolbar
      query={view.q}
      onQuery={onQuery}
      placeholder="Search title, service, code, slug"
      total={total}
      noun={['row', 'rows']}
      filtered={filtered}
      onClear={onClear}
    >
      <SegmentedControl
        items={chipsOf(run)}
        value={chipOf(view.filters)}
        onChange={onChip}
        label="Show rows"
      />
      <SelectField
        aria-label="Flag"
        options={flagOptions()}
        value={view.filters.flag}
        onChange={(event) => onFilter('flag', event.target.value)}
      />
      <SelectField
        aria-label="Brand kind"
        options={BRAND_KIND_OPTIONS}
        value={view.filters.brandKind}
        onChange={(event) => onFilter('brandKind', event.target.value)}
      />
    </ListToolbar>
  );
}
