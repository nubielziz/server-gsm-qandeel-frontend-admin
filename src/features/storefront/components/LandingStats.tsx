// LandingStats: the figures above the landing pages table. Ports the `strip` of tabLanding in 50-p-storefront.js. The demo
// added up visits and orders over every page; a paged list cannot, so the strip counts pages by status (MISMATCHES M107 has the
// same limit) and the table keeps each page's own visits and orders.
import { StatGrid } from '@/components/ui';
import { num } from '@/lib/format';
import { listContentPages } from '../api';
import { useCounts } from '../hooks/useCounts';
import { LANDING_KINDS } from '../types';

const kind = [...LANDING_KINDS];
const SPECS = [
  { id: 'published', filters: { kind, status: 'published' } },
  { id: 'draft', filters: { kind, status: 'draft' } },
  { id: 'noindex', filters: { kind, status: 'noindex' } },
];

/** A count, or a dash while the server has not answered. */
const shown = (count: number | undefined) => (count === undefined ? '–' : num(count));

/** Published pages, drafts and pages kept out of Google. */
export function LandingStats({ enabled }: { enabled: boolean }) {
  const counts = useCounts('landing', listContentPages, SPECS, enabled);
  return (
    <StatGrid
      label="Landing page figures"
      cells={[
        { label: 'Published pages', value: shown(counts.published), sub: 'Live on the public site' },
        { label: 'Drafts', value: shown(counts.draft), sub: 'Waiting for review' },
        {
          label: 'Hidden from Google',
          value: shown(counts.noindex),
          sub: 'Live, but not in search results',
          tip: 'Thin pages are kept out of Google until they have real content, so they do not drag the whole site down.',
        },
      ]}
    />
  );
}
