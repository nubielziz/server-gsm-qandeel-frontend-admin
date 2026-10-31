// PipelineCard: the Order pipeline card of the Orders & suppliers tab: orders past SLA and the money they hold, dispatch
// p95, success per service type and orders held by risk. One HealthCard around `GET /admin/system/orders-health`.
import { Skeleton } from '@/components/ui';
import { HealthCard, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import type { OrdersHealth } from '../../types';
import { HeldByRisk } from './HeldByRisk';
import { PipelineSection } from './PipelineSection';
import { PipelineSummary } from './PipelineSummary';
import { ServiceTypeTable } from './ServiceTypeTable';
import { StuckByStatus } from './StuckByStatus';

/** The first-load placeholder in the card's shape: four figures, then a few table lines. */
function PipelineSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="p-3.5">
      <span className="sr-only">Loading…</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton width="55%" height={10} />
            <Skeleton width="40%" height={20} />
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} width={`${90 - i * 12}%`} height={10} />
        ))}
      </div>
    </div>
  );
}

/**
 * The two tables sit side by side from `xl` and stack below it, so neither is squeezed. Every part reads the one answer of
 * this card; a part that cannot be drawn is the boundary's job (the tab wraps the card in a PartBoundary).
 */
function PipelineBody({ orders }: { orders: OrdersHealth }) {
  return (
    <>
      <PipelineSummary orders={orders} />
      <div className="grid grid-cols-1 divide-y divide-line xl:grid-cols-2 xl:divide-x xl:divide-y-0">
        <PipelineSection title="Past SLA by status">
          <StuckByStatus rows={orders.stuck.byStatus} total={orders.stuck.total} />
        </PipelineSection>
        <PipelineSection title="Finished orders by service type, last 24 hours">
          <ServiceTypeTable rows={orders.byServiceType} />
        </PipelineSection>
      </div>
      <HeldByRisk held={orders.heldByRisk} />
    </>
  );
}

export interface PipelineCardProps {
  /** The read of `GET /admin/system/orders-health`; the tab owns it so it can reset the card's boundary. */
  query: HealthQuery<OrdersHealth>;
}

/** Loading, refreshing, error with Retry, stale and forbidden come from HealthCard, so a failing read never blanks the tab. */
export function PipelineCard({ query }: PipelineCardProps) {
  return (
    <HealthCard
      title="Order pipeline"
      sub="Orders past their SLA, the money they hold and how finished orders ended."
      query={query}
      interval={POLL.normal}
      errorTitle="Could not load the order pipeline"
      permission="system:read"
      skeleton={<PipelineSkeleton />}
      flush
    >
      {(orders) => <PipelineBody orders={orders} />}
    </HealthCard>
  );
}
