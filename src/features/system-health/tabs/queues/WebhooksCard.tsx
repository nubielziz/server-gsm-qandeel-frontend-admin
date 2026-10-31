// WebhooksCard: the "Webhooks" card of the Queues & jobs tab (`GET /admin/system/webhooks`): outgoing webhooks to merchants
// and incoming ones from payment gateways, over the last 24 hours. A stuck webhook is a merchant who never hears of an order.
import { Fragment, useState } from 'react';
import { SkeletonTable, type DataTableColumn } from '@/components/ui';
import { num } from '@/lib/format';
import { HealthCard, type HealthQuery, MeasureValue, ResponsiveTable } from '../../components';
import { POLL } from '../../hooks';
import type { WebhooksHealth } from '../../types';
import { groupWebhooks } from './groups';
import { HealthyStrip } from './HealthyStrip';
import { OldestWaiting } from './OldestWaiting';
import { webhookRows, type WebhookRow } from './webhooks';

export interface WebhooksCardProps {
  query: HealthQuery<WebhooksHealth>;
}

const COLUMNS: DataTableColumn<WebhookRow>[] = [
  {
    key: 'direction',
    label: 'Direction',
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

/** The quiet directions' success rates in one line: "Outgoing 98.74 % · Incoming 99.77 %". */
function SuccessRates({ rows }: { rows: readonly WebhookRow[] }) {
  return (
    <>
      {rows.map((row, index) => (
        <Fragment key={row.id}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <span className="inline-flex items-center gap-1">
            {row.name} <MeasureValue measure={row.health.successRate} />
          </span>
        </Fragment>
      ))}
    </>
  );
}

/**
 * Like the other two cards: a direction in a server state other than ok is a row, worse first; a healthy one folds into
 * the strip, which still says its success rate. Two healthy directions are one quiet line with Show, not a tall table
 * on a phone. The card owns only whether the folded rows are shown. Success rate and the age of the oldest message carry
 * the server's state as a small icon and word.
 */
export function WebhooksCard({ query }: WebhooksCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <HealthCard
      title="Webhooks"
      sub="Delivery over the last 24 hours."
      query={query}
      interval={POLL.normal}
      flush
      permission="system:read"
      errorTitle="Could not load webhook delivery"
      skeleton={<SkeletonTable cols={5} rows={2} />}
    >
      {(data) => {
        const { attention, calm } = groupWebhooks(webhookRows(data));
        const rows = expanded ? [...attention, ...calm] : attention;
        return (
          <>
            {calm.length > 0 && (
              <HealthyStrip
                healthy={calm.length}
                noun="direction"
                all={attention.length === 0}
                expanded={expanded}
                onToggle={() => setExpanded((open) => !open)}
              >
                {/* The rates are in the table once it is shown, so the strip does not say them twice. */}
                {!expanded && <SuccessRates rows={calm} />}
              </HealthyStrip>
            )}
            {rows.length > 0 && (
              <ResponsiveTable
                footer={false}
                caption="Webhook delivery"
                columns={COLUMNS}
                rows={rows}
                rowKey={(row) => row.id}
                cardTitle="direction"
              />
            )}
          </>
        );
      }}
    </HealthCard>
  );
}
