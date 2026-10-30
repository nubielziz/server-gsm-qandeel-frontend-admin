// StorefrontPage: "Storefront" (`/storefront`, the demo's `pageStorefront` in 50-p-storefront.js): a header and five tabs kept in the
// address (`?tab=`), the demo's four plus the TAC catalogue the map adds in place of Live preview (M4). A tab the role may not read is
// hidden. The page only composes; each tab owns its data, and the server decides every price, status and refusal.
import { EmptyState, Panel, SkeletonTable, Tabs, type TabItem } from '@/components/ui';
import { listListings } from '../api';
import { ContentTab } from '../components/ContentTab';
import { HelpTab } from '../components/HelpTab';
import { LandingTab } from '../components/LandingTab';
import { ListingsTab } from '../components/ListingsTab';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { TacTab } from '../components/TacTab';
import { useCounts } from '../hooks/useCounts';
import { useStorefrontGrants } from '../hooks/useStorefrontGrants';
import { useTabView } from '../hooks/useTabView';
import { LISTED_SPEC } from '../lib/counts';
import { STOREFRONT_TABS, type StorefrontTab } from '../lib/tabs';

/** The page: header, tabs and the tab the address names. */
export function StorefrontPage() {
  const grants = useStorefrontGrants();
  const { tab, setTab } = useTabView();
  const counts = useCounts(
    'listings',
    listListings,
    [LISTED_SPEC],
    grants.ready && grants.can('storefront:read'),
  );

  const visible = STOREFRONT_TABS.filter((spec) => grants.canAny(spec.anyOf));
  // An unknown or forbidden `?tab=` falls back to the first tab the staff member may open.
  const current = visible.find((spec) => spec.id === tab) ?? visible[0];
  const items: TabItem<StorefrontTab>[] = visible.map((spec) => ({
    value: spec.id,
    label: spec.label,
    count: spec.id === 'listings' ? counts[LISTED_SPEC.id] : undefined,
  }));

  return (
    <>
      <StorefrontHeader />
      {!grants.ready ? (
        <Panel flush>
          <SkeletonTable cols={5} rows={6} />
        </Panel>
      ) : !current ? (
        <Panel flush>
          <EmptyState icon="lock" title="Nothing here for your role">
            Your role cannot see the storefront, its legal documents or the TAC catalogue. Ask an owner if you
            need access.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <div className="mb-4">
            <Tabs items={items} value={current.id} onChange={setTab} label="Storefront sections" />
          </div>
          <div role="tabpanel" aria-label={current.label}>
            {current.id === 'listings' && <ListingsTab grants={grants} />}
            {current.id === 'landing' && <LandingTab grants={grants} />}
            {current.id === 'content' && <ContentTab grants={grants} />}
            {current.id === 'help' && <HelpTab grants={grants} />}
            {current.id === 'tac' && <TacTab grants={grants} />}
          </div>
        </>
      )}
    </>
  );
}
