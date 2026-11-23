// CatalogPage: "Catalog" (the demo's Services & pricing page, `pageServices` in 43-p-services.js, grown into the catalog). Three views
// that never mount together, chosen by `?view=`: the services table (the default), the Catalog settings and the publish runs. A role
// opens the first view it may use: without catalog:read the table is never mounted or read. The page only composes; each view owns
// its data, and the server computes every price figure.
import { EmptyState, Panel, SkeletonTable } from '@/components/ui';
import { useStorefrontGrants } from '@/features/storefront';
import { CatalogAddServicesDialog } from '../components/catalog/CatalogAddServicesDialog';
import { CatalogPublishView } from '../components/catalog/CatalogPublishView';
import { CatalogSettingsView } from '../components/catalog/CatalogSettingsView';
import { CatalogTableView } from '../components/catalog/CatalogTableView';
import { CatalogViewHeader } from '../components/catalog/CatalogViewHeader';
import { useCatalogView } from '../hooks/useCatalogView';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { SETTINGS_TABS, viewAccess } from '../lib/tabs';

/** The page: the view the address names, or the first one the role may use. */
export function CatalogPage() {
  const grants = useServiceGrants();
  const shop = useStorefrontGrants();
  const tabs = SETTINGS_TABS.filter((spec) => grants.canAll(spec.permissions));
  const access = grants.ready ? viewAccess(grants.can, tabs.length) : undefined;
  const { view, openView } = useCatalogView(access);

  if (view === undefined || access === undefined) {
    return (
      <>
        <CatalogViewHeader />
        <Panel flush>
          <SkeletonTable cols={5} rows={6} />
        </Panel>
      </>
    );
  }
  if (view === null) {
    return (
      <>
        <CatalogViewHeader />
        <Panel flush>
          <EmptyState icon="lock" title="Nothing here for your role">
            Your role cannot see services, prices, the code stock or the publish runs. Ask an owner if you
            need access.
          </EmptyState>
        </Panel>
      </>
    );
  }
  if (view === 'settings') return <CatalogSettingsView tabs={tabs} shop={shop} access={access} />;
  if (view === 'publish') return <CatalogPublishView shop={shop} access={access} />;
  return <CatalogTableView grants={grants} onOpenView={openView} addDialog={CatalogAddServicesDialog} />;
}
