// CatalogPublishView: the publish runs inside the Catalog page (`?view=publish[&run=N]`): with no run in the address, the storefront
// feature's start (what to publish, the earlier runs); with one, that run (its preview, progress or result). The run lives in the
// address through the page's own hook. Viewing needs storefront:read; preparing a run needs storefront:create, which the start's
// button checks, and each run action names the permission it needs.
import { Panel } from '@/components/ui';
import { PublishRunView, PublishStart, type StorefrontGrants } from '@/features/storefront';
import { useCatalogPublishAddress } from '../../hooks/useCatalogPublishAddress';
import type { ViewAccess } from '../../lib/tabs';
import { CatalogViewHeader } from './CatalogViewHeader';

export interface CatalogPublishViewProps {
  /** The storefront grants the publish parts take. */
  shop: StorefrontGrants;
  /** The views the role may use, for the header's links to the others. */
  access: ViewAccess;
}

/** The header, then the start or the run the address names. */
export function CatalogPublishView({ shop, access }: CatalogPublishViewProps) {
  const { runId, openRun, closeRun } = useCatalogPublishAddress();
  return (
    <>
      <CatalogViewHeader sub="Publish runs" current="publish" access={access} />
      <section aria-label="Publish runs">
        <Panel flush>
          {runId === null ? (
            <PublishStart grants={shop} onOpen={openRun} />
          ) : (
            // A new run starts with fresh state (its preview's ticks and dialogs).
            <PublishRunView key={runId} runId={runId} grants={shop} onOpen={openRun} onClose={closeRun} />
          )}
        </Panel>
      </section>
    </>
  );
}
