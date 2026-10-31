// QueuesTable: the rows of the Queues card (route group `health`): name, state, the four counters, oldest job, rate,
// workers and the row's controls. A table from `md` up, cards on a phone (ResponsiveTable). It prints what the server sent.
import type { DataTableColumn } from '@/components/ui';
import { num } from '@/lib/format';
import { HealthBadge, MeasureValue, ResponsiveTable } from '../../components';
import type { QueueStats } from '../../types';
import type { QueueDialog } from './dialogState';
import { OldestWaiting } from './OldestWaiting';
import { QueueRowActions } from './QueueRowActions';

export interface QueuesTableProps {
  rows: readonly QueueStats[];
  onDialog: (dialog: QueueDialog) => void;
  onOpenFailed: (queue: string) => void;
}

/**
 * Low-priority columns (delayed, rate, workers) drop out on narrower screens, as the console's tables do; a phone card
 * shows all of them. The controls column starts at the left, so Pause sits in one column whatever else a row offers, and
 * spaces the buttons with a sibling margin: in the card foot the flex gap does that, so the same fragment of buttons works
 * in both layouts.
 */
export function QueuesTable({ rows, onDialog, onOpenFailed }: QueuesTableProps) {
  const columns: DataTableColumn<QueueStats>[] = [
    { key: 'queue', label: 'Queue', render: (queue) => <span className="mono">{queue.name}</span> },
    {
      key: 'state',
      label: 'State',
      render: (queue) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <HealthBadge status={queue.state} />
          {queue.paused && <HealthBadge status="paused" />}
        </span>
      ),
    },
    { key: 'waiting', label: 'Waiting', num: true, render: (queue) => num(queue.waiting) },
    { key: 'active', label: 'Active', num: true, render: (queue) => num(queue.active) },
    { key: 'delayed', label: 'Delayed', num: true, hide: 'xl', render: (queue) => num(queue.delayed) },
    { key: 'failed', label: 'Failed', num: true, render: (queue) => num(queue.failed) },
    {
      // The KPI cell and the card's strip call this figure "Oldest queued job". The header stays short on purpose: the
      // table is tight from 800 to 1280 px, and 40 px more here pushes the row controls onto three or four lines.
      key: 'oldest',
      label: 'Oldest job',
      num: true,
      render: (queue) => <OldestWaiting measure={queue.oldestAge} none={queue.waiting === 0} />,
    },
    {
      key: 'rate',
      label: 'Rate',
      num: true,
      hide: 'lg',
      render: (queue) => <MeasureValue measure={queue.ratePerMin} />,
    },
    { key: 'workers', label: 'Workers', num: true, hide: 'xl', render: (queue) => num(queue.workers) },
    {
      key: 'actions',
      label: '',
      className: '[&>*]:align-middle [&>*+*]:ms-1.5',
      render: (queue) => <QueueRowActions queue={queue} onDialog={onDialog} onOpenFailed={onOpenFailed} />,
    },
  ];
  return (
    <ResponsiveTable
      footer={false}
      caption="Queues"
      columns={columns}
      rows={rows}
      rowKey={(queue) => queue.name}
      cardTitle="queue"
    />
  );
}
