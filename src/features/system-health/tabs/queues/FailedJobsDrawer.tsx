// FailedJobsDrawer: the side sheet of one queue's failed jobs, opened by `?queue=<name>` (`GET …/queues/:name/failed`).
// 25 a page, newest first, with Retry per job and Retry all failed in the foot. Closing it clears `?queue=`.
import { useRef, useState } from 'react';
import { Button, Drawer, EmptyState, Pager, SkeletonTable, usePageClamp } from '@/components/ui';
import { ActionButton, HealthCard } from '../../components';
import { PartBoundary } from '../../header/PartBoundary';
import { PAGE_SIZE, POLL, useFailedJobs } from '../../hooks';
import type { QueueDialog } from './dialogState';
import { FailedJobItem } from './FailedJobItem';
import { pageRange } from './failed';
import { countOf } from './text';

export interface FailedJobsDrawerProps {
  queue: string;
  onClose: () => void;
  onDialog: (dialog: QueueDialog) => void;
}

/**
 * The page number is local: it is not worth a link, and it starts at 1 for each queue because the drawer mounts per
 * queue. If retrying shrinks the list under the page being shown, `usePageClamp` steps back to the last page. The list is
 * a HealthCard whose title is the count, so loading, errors, a stale answer and a missing permission read like every
 * other card.
 */
export function FailedJobsDrawer({ queue, onClose, onDialog }: FailedJobsDrawerProps) {
  const [page, setPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);
  const query = useFailedJobs(queue, pageRange(page));
  const total = query.data?.total;
  usePageClamp({ page, pageSize: PAGE_SIZE, total, settled: !query.isPlaceholderData, setPage });

  // The pager is at the foot of a long list: after a click the new page should start at its first row, not at its last.
  // The anchor sits below the body's 16px top padding; `scroll-mt-4` leaves that gap in view, so the card's top edge is not
  // hidden under the header's hairline.
  function changePage(next: number) {
    setPage(next);
    top.current?.scrollIntoView?.({ block: 'start' });
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Failed jobs"
      sub={<span className="mono">{queue}</span>}
      footer={
        <>
          {total ? (
            <ActionButton
              permission="system:manage"
              onClick={() => onDialog({ kind: 'retryAll', queue, failed: total })}
            >
              Retry all failed
            </ActionButton>
          ) : null}
          <span className="flex-1" />
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div ref={top} className="scroll-mt-4" />
      <HealthCard
        title={total === undefined ? 'Failed jobs' : countOf(total, 'failed job')}
        sub="Newest first."
        query={query}
        interval={POLL.normal}
        flush
        permission="system:read"
        errorTitle={`Could not load the failed jobs of ${queue}`}
        skeleton={<SkeletonTable cols={2} rows={5} />}
      >
        {(result) => (
          <PartBoundary name="The failed jobs" resetKey={query.dataUpdatedAt}>
            {result.data.length === 0 ? (
              <EmptyState title="No failed jobs">
                Jobs of {queue} that run out of attempts are listed here, newest first.
              </EmptyState>
            ) : (
              <>
                <ul aria-label={`Failed jobs of ${queue}`} className="m-0 list-none divide-y divide-line p-0">
                  {result.data.map((job) => (
                    <FailedJobItem
                      key={job.id}
                      job={job}
                      onRetry={() => onDialog({ kind: 'retryOne', queue, job })}
                    />
                  ))}
                </ul>
                {result.total > PAGE_SIZE && (
                  <Pager page={page} pageSize={PAGE_SIZE} total={result.total} onPageChange={changePage} />
                )}
              </>
            )}
          </PartBoundary>
        )}
      </HealthCard>
    </Drawer>
  );
}
