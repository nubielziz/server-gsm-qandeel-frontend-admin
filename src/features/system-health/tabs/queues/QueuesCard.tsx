// QueuesCard: the "Queues" card of the Queues & jobs tab (`GET /admin/system/queues`). Queues that need a look come first;
// the healthy ones fold into one quiet line with Show. Controls per row: pause or resume, retry all failed, failed jobs.
import { useState } from 'react';
import { SkeletonTable } from '@/components/ui';
import { HealthCard, MeasureValue, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import type { QueuesResponse } from '../../types';
import type { QueueDialog } from './dialogState';
import { groupQueues } from './groups';
import { HealthyStrip } from './HealthyStrip';
import { QueuesTable } from './QueuesTable';
import { countOf } from './text';

export interface QueuesCardProps {
  query: HealthQuery<QueuesResponse>;
  onDialog: (dialog: QueueDialog) => void;
  onOpenFailed: (queue: string) => void;
}

/**
 * The card owns only whether the healthy rows are shown. With nothing to look at it is just the strip: the oldest queued
 * job of all queues (the figure of the KPI cell, with the same name) and "All 8 queues healthy · Show". Everything on
 * screen is a number or state the server sent.
 */
export function QueuesCard({ query, onDialog, onOpenFailed }: QueuesCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <HealthCard
      title="Queues"
      sub="Background jobs waiting, running and failed, per queue."
      query={query}
      interval={POLL.fast}
      flush
      permission="system:read"
      errorTitle="Could not load the queues"
      emptyText="Queue counters appear here once the workers report them."
      isEmpty={(data) => data.queues.length === 0}
      skeleton={<SkeletonTable cols={6} rows={4} />}
    >
      {(data) => {
        const { attention, calm } = groupQueues(data.queues);
        const rows = expanded ? [...attention, ...calm] : attention;
        return (
          <>
            <HealthyStrip
              healthy={calm.length}
              noun="queue"
              all={attention.length === 0}
              expanded={expanded}
              onToggle={() => setExpanded((open) => !open)}
            >
              <span>{countOf(data.queues.length, 'queue')}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                Oldest queued job <MeasureValue measure={data.oldestAge} />
              </span>
            </HealthyStrip>
            {rows.length > 0 && <QueuesTable rows={rows} onDialog={onDialog} onOpenFailed={onOpenFailed} />}
          </>
        );
      }}
    </HealthCard>
  );
}
