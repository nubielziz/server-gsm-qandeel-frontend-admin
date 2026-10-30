// ListingStats: the figures above the listings table. Ports the `strip` of tabListings in 50-p-storefront.js. The demo summed
// margins and 30-day orders over every row; a paged list cannot, so the strip shows the counted figures the server gives
// (MISMATCHES M107 has the same limit) and the table keeps the per-row margin and orders.
import { StatGrid } from '@/components/ui';
import { num } from '@/lib/format';
import { listListings } from '../api';
import { useCounts } from '../hooks/useCounts';
import { LISTED_SPEC } from '../lib/counts';

const SPECS = [
  LISTED_SPEC,
  { id: 'unlisted', filters: { isListed: false, locked: false } },
  { id: 'locked', filters: { locked: true } },
];

/** A count, or a dash while the server has not answered. */
const shown = (count: number | undefined) => (count === undefined ? '–' : num(count));

/** Services on the site, off it and locked to B2B. */
export function ListingStats({ enabled }: { enabled: boolean }) {
  const counts = useCounts('listings', listListings, SPECS, enabled);
  return (
    <StatGrid
      label="Storefront catalogue"
      cells={[
        { label: 'Services on the site', value: shown(counts.listed), sub: 'Customers can buy these' },
        { label: 'Not on the site', value: shown(counts.unlisted), sub: 'Switched off or not yet listed' },
        {
          label: 'Locked to B2B',
          value: shown(counts.locked),
          sub: 'Removal and disabled services',
          tip: 'Services that attract stolen devices are never shown to the public. They stay available to merchants through the API.',
        },
      ]}
    />
  );
}
