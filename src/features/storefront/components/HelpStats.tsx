// HelpStats: the figures above the help articles table. Ports the `strip` of tabHelp in 50-p-storefront.js. The demo summed votes
// over every article ("found helpful", "most read"); a paged list cannot, so the strip counts articles (MISMATCHES M107 has the
// same limit) and the table keeps each article's own votes and its "Most readers said this did not help" line.
import { StatGrid } from '@/components/ui';
import { num } from '@/lib/format';
import { listHelpArticles } from '../api';
import { useCounts } from '../hooks/useCounts';

const SPECS = [
  { id: 'all' },
  { id: 'published', filters: { isPublished: true } },
  { id: 'draft', filters: { isPublished: false } },
];

/** A count, or a dash while the server has not answered. */
const shown = (count: number | undefined) => (count === undefined ? '–' : num(count));

/** All articles, the published ones and the drafts. */
export function HelpStats({ enabled }: { enabled: boolean }) {
  const counts = useCounts('help', listHelpArticles, SPECS, enabled);
  return (
    <StatGrid
      label="Help centre figures"
      cells={[
        { label: 'Articles', value: shown(counts.all), sub: 'In the help centre' },
        { label: 'Published', value: shown(counts.published), sub: 'Readers can see these' },
        { label: 'In draft', value: shown(counts.draft), sub: 'Not on the site yet' },
      ]}
    />
  );
}
