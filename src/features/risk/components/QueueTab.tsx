// QueueTab: the Review queue tab: the strip of figures, a card for every held order with its decision buttons, and the
// latest decisions. Ports `tabQueue` of 54-p-risk.js. Approving sends the order to its supplier at once; refunding opens a
// dialog first. The server scored the orders and decides what the buttons do; this tab only lists and asks.
import { useState } from 'react';
import { EmptyState, Panel, QueryState, SkeletonStat, SkeletonTable } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useApproveHeldOrder } from '../hooks/useRiskDecisions';
import type { RiskGrants } from '../hooks/useRiskGrants';
import { useRiskQueue } from '../hooks/useRiskQueue';
import { oldestFirst } from '../lib/queue';
import type { HeldOrder } from '../types';
import { HeldCard } from './HeldCard';
import { QueueStats } from './QueueStats';
import { RecentDecisions } from './RecentDecisions';
import { RefundHeldDialog } from './RefundHeldDialog';

type RefundState = { order: HeldOrder; block: boolean };

export function QueueTab({ grants }: { grants: RiskGrants }) {
  const queue = useRiskQueue();
  const approve = useApproveHeldOrder();
  const now = useNow();
  const [refund, setRefund] = useState<RefundState | null>(null);
  const data = queue.data;

  return (
    <>
      <QueryState
        isLoading={queue.isLoading}
        isError={queue.isError}
        error={queue.error}
        errorTitle="Could not load the review queue"
        onRetry={() => void queue.refetch()}
        skeleton={
          <>
            <SkeletonStat cells={4} />
            <Panel flush>
              <SkeletonTable cols={4} rows={4} />
            </Panel>
          </>
        }
      >
        {data && (
          <>
            <QueueStats held={data.held} stats={data.stats} now={now} />
            {data.held.length > 0 ? (
              <div className="grid gap-4">
                {oldestFirst(data.held).map((order) => (
                  <HeldCard
                    key={order.orderId}
                    order={order}
                    grants={grants}
                    now={now}
                    approving={approve.isPending && approve.variables?.orderId === order.orderId}
                    onApprove={(target) => approve.mutate(target)}
                    onRefund={(target, block) => setRefund({ order: target, block })}
                  />
                ))}
              </div>
            ) : (
              <Panel flush>
                <EmptyState icon="shield" title="Nothing is being held">
                  Orders with a high risk score wait here for a person. Right now every paid order went
                  straight through.
                </EmptyState>
              </Panel>
            )}
            <RecentDecisions rows={data.recent} now={now} />
          </>
        )}
      </QueryState>
      {refund && (
        <RefundHeldDialog
          key={refund.order.orderId}
          order={refund.order}
          block={refund.block}
          onClose={() => setRefund(null)}
        />
      )}
    </>
  );
}
