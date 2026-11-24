// WebhooksCard: the "Webhooks" card of the Queues & jobs tab (`GET /admin/system/webhooks`): the callbacks payment gateways send
// us, over the last 24 hours. A stuck callback is a payment nobody hears about.
import { SkeletonTable, type DataTableColumn } from '@/components/ui';
import { num } from '@/lib/format';
import { HealthCard, type HealthQuery, MeasureValue, ResponsiveTable } from '../../components';
import { POLL } from '../../hooks';
import type { WebhooksHealth } from '../../types';
import { OldestWaiting } from './OldestWaiting';
import { webhookRow, type WebhookRow } from './webhooks';

export interface WebhooksCardProps {
  query: HealthQuery<WebhooksHealth>;
}

const COLUMNS: DataTableColumn<WebhookRow>[] = [
  {
    key: 'source',
    label: 'Source',
    render: (row) => (
      <span className="block">
        <span className="block font-medium">{row.name}</span>
        <span className="block text-xs text-ink3">{row.sub}</span>
      </span>
    ),
  },
  {
    key: 'success',
    label: 'Success rate',
    num: true,
    render: (row) => <MeasureValue measure={row.health.successRate} />,
  },
  { key: 'delivered', label: 'Delivered', num: true, render: (row) => num(row.health.delivered) },
  { key: 'failed', label: 'Failed', num: true, render: (row) => num(row.health.failed) },
  { key: 'retrying', label: 'Retrying', num: true, render: (row) => num(row.health.retrying) },
  {
    key: 'oldest',
    label: 'Oldest undelivered',
    num: true,
    render: (row) => (
      <OldestWaiting measure={row.health.oldestAge} none={row.health.oldestUndeliveredAt === null} />
    ),
  },
];

/**
 * One row, always shown: there is nothing to fold away beside it. Success rate and the age of the oldest message carry the
 * server's state as a small icon and word.
 */
export function WebhooksCard({ query }: WebhooksCardProps) {
  return (
    <HealthCard
      title="Webhooks"
      sub="Callbacks from payment gateways over the last 24 hours."
      query={query}
      interval={POLL.normal}
      flush
      permission="system:read"
      errorTitle="Could not load webhook delivery"
      skeleton={<SkeletonTable cols={5} rows={1} />}
    >
      {(data) => (
        <ResponsiveTable
          footer={false}
          caption="Webhook delivery"
          columns={COLUMNS}
          rows={[webhookRow(data)]}
          rowKey={(row) => row.id}
          cardTitle="source"
        />
      )}
    </HealthCard>
  );
}
