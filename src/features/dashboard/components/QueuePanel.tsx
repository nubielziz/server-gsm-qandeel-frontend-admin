// QueuePanel: "Open queue by type", one row per service type with a bar split into on time, needs review and past SLA.
// Ports queuePanel() of 40-p-dashboard.js. Each row links to the matching orders list.
import { Icon, Panel, SkeletonTable } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import { useQueueMonitorUrl } from '../hooks/useDashboardGrants';
import { queueTarget } from '../lib/links';
import type { DashboardScope, QueueByType } from '../types';
import { QueueRow } from './QueueRow';

export interface QueuePanelProps {
  /** `undefined` while the dashboard loads. */
  queues: QueueByType[] | undefined;
  scope: DashboardScope;
}

/** The queue by type with the queue monitor link for staff with `queues:read`; rows link to Orders when the staff member may open it. */
export function QueuePanel({ queues, scope }: QueuePanelProps) {
  const now = useNow();
  const canOpen = useCanOpenPage('orders') === true;
  const monitorUrl = useQueueMonitorUrl();
  const monitor = monitorUrl && (
    <a className="btn btn-ghost btn-sm" href={monitorUrl} target="_blank" rel="noopener noreferrer">
      Queue monitor
      <Icon name="ext" className="ic-xs" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
  if (!queues) {
    return (
      <Panel title="Open queue by type" right={monitor || undefined} flush>
        <SkeletonTable cols={3} rows={4} />
      </Panel>
    );
  }
  const waiting = queues.reduce((total, queue) => total + queue.open, 0);
  return (
    <Panel
      title="Open queue by type"
      sub={`${waiting} orders waiting. Bars split on time, review and late.`}
      right={monitor || undefined}
      flush
    >
      <ul className="m-0 list-none divide-y divide-line p-0">
        {queues.map((queue) => (
          <QueueRow
            key={queue.type}
            queue={queue}
            to={canOpen ? queueTarget(queue.type, scope).to : undefined}
            now={now}
          />
        ))}
      </ul>
    </Panel>
  );
}
