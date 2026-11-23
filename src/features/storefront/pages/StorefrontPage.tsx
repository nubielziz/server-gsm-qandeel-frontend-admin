// StorefrontPage: "Shop content" (`/storefront`, the demo's `pageStorefront` in 50-p-storefront.js): a header and five tabs kept in the
// address (`?tab=`), the demo's Landing pages, Content and legal and Help centre, the TAC catalogue the map adds in place of Live
// preview (M4) and the Search tab of the shop's search engine (backend feature 29). A tab the role may not read is hidden. The
// services on the shop, publishing and retail pricing live on the Product / Services page. The page only composes; each tab owns its data,
// and the server decides every status and refusal.
import { EmptyState, Panel, SkeletonTable, Tabs, type TabItem } from '@/components/ui';
import { ContentTab } from '../components/ContentTab';
import { HelpTab } from '../components/HelpTab';
import { LandingTab } from '../components/LandingTab';
import { SearchTab } from '../components/SearchTab';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { TacTab } from '../components/TacTab';
import { useStorefrontGrants } from '../hooks/useStorefrontGrants';
import { usePinTab, useTabView } from '../hooks/useTabView';
import { STOREFRONT_TABS, type StorefrontTab } from '../lib/tabs';

/** The page: header, tabs and the tab the address names. */
export function StorefrontPage() {
  const grants = useStorefrontGrants();
  const { tab, setTab } = useTabView();

  const visible = STOREFRONT_TABS.filter((spec) => grants.canAny(spec.anyOf));
  // An unknown or forbidden `?tab=` falls back to the first tab the staff member may open.
  const current = visible.find((spec) => spec.id === tab) ?? visible[0];
  // The address always names the tab on screen (the default one too, from the first render), so a search or a page number never sits
  // in an address without one: such an address reads as an old listings link.
  usePinTab(current?.id ?? (grants.ready ? undefined : tab));
  const items: TabItem<StorefrontTab>[] = visible.map((spec) => ({ value: spec.id, label: spec.label }));

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
            Your role cannot see the shop content, its legal documents or the TAC catalogue. Ask an owner if
            you need access.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <div className="mb-4">
            <Tabs items={items} value={current.id} onChange={setTab} label="Shop content sections" />
          </div>
          <div role="tabpanel" aria-label={current.label}>
            {current.id === 'landing' && <LandingTab grants={grants} />}
            {current.id === 'content' && <ContentTab grants={grants} />}
            {current.id === 'help' && <HelpTab grants={grants} />}
            {current.id === 'tac' && <TacTab grants={grants} />}
            {current.id === 'search' && <SearchTab grants={grants} />}
          </div>
        </>
      )}
    </>
  );
}
