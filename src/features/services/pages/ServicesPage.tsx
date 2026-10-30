// ServicesPage: "Services & pricing" (`/services`, the demo's `pageServices` in 43-p-services.js). A header with the below-floor sentence and
// the page's two actions, then five tabs kept in the address (`?tab=`): Services, Price resolver, Rules and groups, and two the map
// adds, Categories and Code inventory. A tab whose permissions the staff member lacks is hidden. The page only composes; each tab owns
// its data, and the server computes every price figure.
import { useState } from 'react';
import {
  EmptyState,
  Panel,
  SectionTabs,
  SkeletonTable,
  useRowSelection,
  type TabItem,
} from '@/components/ui';
import { CategoriesTab } from '../components/CategoriesTab';
import { InventoryTab } from '../components/InventoryTab';
import { ResolverTab } from '../components/ResolverTab';
import { RulesTab } from '../components/RulesTab';
import { ServiceDialogs } from '../components/ServiceDialogs';
import type { ServiceDialogState } from '../components/serviceDialogState';
import { ServicesHeader } from '../components/ServicesHeader';
import { ServicesTab } from '../components/ServicesTab';
import { useServiceCounts } from '../hooks/useServiceCounts';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { useTabView } from '../hooks/useTabView';
import { SERVICES_TABS, type ServicesTab as TabId } from '../lib/tabs';

/** The page: header, tabs and the tab the address names. */
export function ServicesPage() {
  const grants = useServiceGrants();
  const { tab, setTab } = useTabView();
  const counts = useServiceCounts(grants.ready && grants.can('catalog:read'));
  const selection = useRowSelection<number>();
  const [dialog, setDialog] = useState<ServiceDialogState | null>(null);

  const visible = SERVICES_TABS.filter((spec) => grants.canAll(spec.permissions));
  // An unknown or forbidden `?tab=` falls back to the first tab the staff member may open.
  const current = visible.find((spec) => spec.id === tab) ?? visible[0];
  const items: TabItem<TabId>[] = visible.map((spec) => ({
    value: spec.id,
    label: spec.label,
    count: spec.id === 'services' ? counts.all : undefined,
  }));
  // Ticks belong to the Services tab's list, so they are dropped when another tab opens.
  const openTab = (next: TabId) => {
    selection.clear();
    setTab(next);
  };

  return (
    <>
      <ServicesHeader
        grants={grants}
        belowFloor={counts.belowFloor}
        onBulk={() => setDialog({ kind: 'bulk' })}
        onCreate={() => setDialog({ kind: 'create' })}
      />
      {!grants.ready ? (
        <Panel flush>
          <SkeletonTable cols={5} rows={6} />
        </Panel>
      ) : !current ? (
        <Panel flush>
          <EmptyState icon="lock" title="Nothing here for your role">
            Your role cannot see services, prices or the code stock. Ask an owner if you need access.
          </EmptyState>
        </Panel>
      ) : (
        <Panel flush>
          <SectionTabs items={items} value={current.id} onChange={openTab} label="Pricing sections" />
          <div role="tabpanel" aria-label={current.label}>
            {current.id === 'services' && (
              <ServicesTab grants={grants} selection={selection} onDialog={setDialog} />
            )}
            {current.id === 'resolver' && <ResolverTab />}
            {current.id === 'rules' && <RulesTab />}
            {current.id === 'categories' && <CategoriesTab />}
            {current.id === 'inventory' && <InventoryTab />}
          </div>
        </Panel>
      )}
      <ServiceDialogs dialog={dialog} selection={selection} onClose={() => setDialog(null)} />
    </>
  );
}
