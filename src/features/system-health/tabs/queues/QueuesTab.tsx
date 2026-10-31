// QueuesTab: the "Queues & jobs" tab of the System health page (route group `health`). Four reads, each in its own card:
// the queue counters, the scheduled jobs, webhook delivery and, in a drawer, the failed jobs of `?queue=` or the run
// history of `?job=`. The tab only composes; each card handles its own loading, error and stale states.
import { useCallback, useState } from 'react';
import { PartBoundary } from '../../header/PartBoundary';
import { useJobs, useQueues, useWebhooksHealth } from '../../hooks';
import type { QueueDialog } from './dialogState';
import { FailedJobsDrawer } from './FailedJobsDrawer';
import { JobHistoryDrawer } from './JobHistoryDrawer';
import { JobsCard } from './JobsCard';
import { QueueDialogs } from './QueueDialogs';
import { QueuesCard } from './QueuesCard';
import { useQueuesView } from './useQueuesView';
import { WebhooksCard } from './WebhooksCard';

/**
 * The reads sit here so each card can sit in its own `PartBoundary`: a card that cannot draw an answer it did not expect
 * shows a note and tries again with the next answer, and the rest of the tab stays. The one open dialog is held here too,
 * because the queue table, the failed-jobs drawer and the jobs table open the same dialogs. Each drawer is keyed by its
 * name, so a Back or a link that swaps one queue for another starts the new drawer on its first page.
 */
export function QueuesTab() {
  const view = useQueuesView();
  const [dialog, setDialog] = useState<QueueDialog | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const queues = useQueues();
  const jobs = useJobs();
  const webhooks = useWebhooksHealth();

  return (
    <div className="space-y-4">
      <PartBoundary name="The queues" resetKey={queues.dataUpdatedAt}>
        <QueuesCard query={queues} onDialog={setDialog} onOpenFailed={view.openQueue} />
      </PartBoundary>
      <PartBoundary name="The scheduled jobs" resetKey={jobs.dataUpdatedAt}>
        <JobsCard query={jobs} onDialog={setDialog} onOpenHistory={view.openJob} />
      </PartBoundary>
      <PartBoundary name="Webhook delivery" resetKey={webhooks.dataUpdatedAt}>
        <WebhooksCard query={webhooks} />
      </PartBoundary>
      {view.queue && (
        <FailedJobsDrawer
          key={view.queue}
          queue={view.queue}
          onClose={view.closeQueue}
          onDialog={setDialog}
        />
      )}
      {view.job && (
        <JobHistoryDrawer key={view.job} job={view.job} onClose={view.closeJob} onDialog={setDialog} />
      )}
      <QueueDialogs dialog={dialog} onClose={closeDialog} />
    </div>
  );
}
