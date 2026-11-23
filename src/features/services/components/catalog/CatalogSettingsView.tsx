// CatalogSettingsView: the Catalog settings (`?view=settings&tab=…`): the categories, the merchant price rules (with the merchant
// groups), the shop price rules (the storefront feature's retail pricing, with the proposals that wait counted on its tab), the price
// resolver and the code stock. A tab the role may not open is hidden. Each tab owns its data and its own address keys; this view is
// never mounted with the table, so their keys never meet.
import { Panel, Tabs, type TabItem } from '@/components/ui';
import { RetailPricingTab, useWaitingCount, type StorefrontGrants } from '@/features/storefront';
import { useCatalogSettingsTab } from '../../hooks/useCatalogSettingsTab';
import type { CatalogSettingsTab, SettingsTabSpec, ViewAccess } from '../../lib/tabs';
import { CategoriesTab } from '../CategoriesTab';
import { InventoryTab } from '../InventoryTab';
import { ResolverTab } from '../ResolverTab';
import { RulesTab } from '../RulesTab';
import { CatalogViewHeader } from './CatalogViewHeader';

export interface CatalogSettingsViewProps {
  /** The tabs the role may open, in order (at least one: the page falls back to another view otherwise). */
  tabs: readonly SettingsTabSpec[];
  /** The storefront grants the shop price rules take. */
  shop: StorefrontGrants;
  /** The views the role may use, for the header's links to the others. */
  access: ViewAccess;
}

/** The header, the tab strip and the open tab. */
export function CatalogSettingsView({ tabs, shop, access }: CatalogSettingsViewProps) {
  const { current, setTab } = useCatalogSettingsTab(tabs);
  // The proposals that wait for a person show on the Shop price rules tab as a chip (none: no chip).
  const waiting = useWaitingCount(shop.ready && shop.can('pricing:read'));
  const items: TabItem<CatalogSettingsTab>[] = tabs.map((spec) => ({
    value: spec.id,
    label: spec.label,
    count: spec.id === 'shop-prices' && waiting ? waiting : undefined,
  }));

  return (
    <>
      <CatalogViewHeader sub="Catalog settings" current="settings" access={access} />
      {current && (
        <section aria-label="Catalog settings">
          <div className="mb-4">
            <Tabs items={items} value={current.id} onChange={setTab} label="Catalog settings sections" />
          </div>
          <div role="tabpanel" aria-label={current.label}>
            {/* The shop price rules bring their own panel; the services tabs sit in one. */}
            {current.id === 'shop-prices' ? (
              <RetailPricingTab grants={shop} />
            ) : (
              <Panel flush>
                {current.id === 'categories' && <CategoriesTab />}
                {current.id === 'rules' && <RulesTab />}
                {current.id === 'resolver' && <ResolverTab />}
                {current.id === 'inventory' && <InventoryTab />}
              </Panel>
            )}
          </div>
        </section>
      )}
    </>
  );
}
