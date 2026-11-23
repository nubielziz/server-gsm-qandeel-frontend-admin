// PublishView: the publish runs inside the Product / Services frame (`?view=publish[&run=N]`): with no run in the address, the storefront
// feature's start (what to publish, the earlier runs); with one, that run (its preview, progress or result). Viewing needs storefront:read;
// preparing a run needs storefront:create, which the start's button checks, and each run action names the permission it needs. The runs
// have no kind, so the strip does not narrow them. Nothing is wrapped in a card: the start and the run draw their own sections and their own
// pinned bar. The preview and its row dialogs stay dialogs in this version.
import { PublishRunView, PublishStart, useStorefrontGrants } from '@/features/storefront';
import { useProductsRun } from '../../../hooks/useProductsRun';
import type { ProductsViewProps } from '../types';

/** The start of the view or the run the address names. */
export function PublishView({ type }: ProductsViewProps) {
  const shop = useStorefrontGrants();
  const { runId, openRun, closeRun } = useProductsRun(type);
  return runId === null ? (
    <PublishStart grants={shop} onOpen={openRun} />
  ) : (
    // A new run starts with fresh state (its preview's ticks and dialogs).
    <PublishRunView key={runId} runId={runId} grants={shop} onOpen={openRun} onClose={closeRun} />
  );
}
