// PublishTab: the publish view's container (new, backend feature 31): puts services on the shop in bulk. One panel: with no run in the
// address it is the start (what to publish, the earlier runs); with `run=<id>` it is that run: the preview being prepared, the
// preview to review, the progress, or the result. The Catalog page mounts the same parts under its own address hook. Needs
// storefront:create; each button says which other permission it needs.
import { Panel } from '@/components/ui';
import { usePublishAddress } from '../../hooks/usePublishAddress';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { PublishRunView } from './PublishRunView';
import { PublishStart } from './PublishStart';

/** The start or the run the address names. */
export function PublishTab({ grants }: { grants: StorefrontGrants }) {
  const { runId, openRun, closeRun } = usePublishAddress();
  return (
    <Panel flush>
      {runId === null ? (
        <PublishStart grants={grants} onOpen={openRun} />
      ) : (
        <PublishRunView runId={runId} grants={grants} onOpen={openRun} onClose={closeRun} />
      )}
    </Panel>
  );
}
