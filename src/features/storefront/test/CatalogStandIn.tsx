// A test stand-in for the Catalog page's views, so the listings, publish and retail pricing components keep their tests while
// the Catalog page is built elsewhere: it mounts the component the address names, at the addresses the Catalog uses
// (`?view=publish[&run=N]`, `?view=settings&tab=shop-prices`, anything else is the listings). Each view carries the one-tab strip with
// the count the old Storefront tabs showed (the listings on the site, the proposals that wait), so the tests that prove those counts
// are asked again after a change still have a reader of them. Import it from tests only.
import { SkeletonTable, Tabs } from '@/components/ui';
import { useSearchParams } from 'react-router';
import { listListings } from '../api';
import { ListingsTab } from '../components/ListingsTab';
import { RetailPricingTab } from '../components/pricing/RetailPricingTab';
import { PublishTab } from '../components/publish/PublishTab';
import { useCounts } from '../hooks/useCounts';
import { useWaitingCount } from '../hooks/useRetailPricing';
import { useStorefrontGrants, type StorefrontGrants } from '../hooks/useStorefrontGrants';
import { LISTED_SPEC } from '../lib/counts';

/** A one-tab strip with a chip, the stand-in of the Catalog's own strips. A zero count shows no chip. */
function Strip({ label, tab, count }: { label: string; tab: string; count: number | undefined }) {
  return (
    <div className="mb-4">
      <Tabs
        items={[{ value: tab, label: tab, count: count || undefined }]}
        value={tab}
        onChange={() => undefined}
        label={label}
      />
    </div>
  );
}

/** The publish view, with the listings on the site counted above it (what the first tab of the old page did). */
function PublishView({ grants }: { grants: StorefrontGrants }) {
  const counts = useCounts('listings', listListings, [LISTED_SPEC], grants.can('storefront:read'));
  return (
    <>
      <Strip label="Catalog table sections" tab="Services on sale" count={counts[LISTED_SPEC.id]} />
      <PublishTab grants={grants} />
    </>
  );
}

/** The shop price rules, with the proposals that wait counted above them. */
function RetailSettings({ grants }: { grants: StorefrontGrants }) {
  const waiting = useWaitingCount(grants.can('pricing:read'));
  return (
    <>
      <Strip label="Catalog settings sections" tab="Retail pricing" count={waiting} />
      <RetailPricingTab grants={grants} />
    </>
  );
}

/** The view the address names, mounted once the staff member's permissions are known (as the pages do). */
export function CatalogStandIn() {
  const grants = useStorefrontGrants();
  const [params] = useSearchParams();
  if (!grants.ready) return <SkeletonTable cols={5} rows={6} />;
  const view = params.get('view');
  return (
    <div data-testid="catalog-view">
      {view === 'publish' ? (
        <PublishView grants={grants} />
      ) : view === 'settings' && params.get('tab') === 'shop-prices' ? (
        <RetailSettings grants={grants} />
      ) : (
        <ListingsTab grants={grants} />
      )}
    </div>
  );
}
