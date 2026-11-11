// CampaignRecipients: the people of a campaign on one channel: a channel switch (only the campaign's channels), a status filter, and a paged table with the
// masked address, the kind of person, the status, the error and when it was sent or read. The table follows the sending while the campaign is in flight.
import { useState } from 'react';
import {
  Badge,
  DataTable,
  EmptyState,
  Panel,
  SegmentedControl,
  SelectField,
  type DataTableColumn,
} from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { RECIPIENTS_PAGE_SIZE, useRecipients } from '../hooks/useRecipients';
import {
  CHANNEL_LABEL,
  isInFlight,
  RECIPIENT_STATUS_BY_CHANNEL,
  RECIPIENT_STATUS_LOOK,
  RECIPIENT_TYPE_LABEL,
} from '../lib/status';
import type { CampaignChannel, CampaignDetail, CampaignRecipient, RecipientStatus } from '../types';

const COLUMNS: DataTableColumn<CampaignRecipient>[] = [
  {
    key: 'recipient',
    label: 'Recipient',
    render: (row) => (
      <>
        <p className="mono">{row.recipient}</p>
        <p className="text-2xs text-ink3">{RECIPIENT_TYPE_LABEL[row.recipientType]}</p>
      </>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const look = RECIPIENT_STATUS_LOOK[row.status];
      return (
        <Badge tone={look.tone} icon={look.icon}>
          {look.label}
        </Badge>
      );
    },
  },
  {
    key: 'error',
    label: 'Error',
    hide: 'md',
    render: (row) =>
      row.error ? <span className="text-crit-fg">{row.error}</span> : <span className="text-ink3">–</span>,
  },
  {
    key: 'when',
    label: 'Sent or read',
    hide: 'sm',
    render: (row) => <span className="text-ink2">{fmtDate(row.readAt ?? row.sentAt ?? row.createdAt)}</span>,
  },
];

export function CampaignRecipients({ campaign }: { campaign: CampaignDetail }) {
  const [channel, setChannel] = useState<CampaignChannel>(campaign.channels[0] ?? 'in_app');
  const [status, setStatus] = useState<RecipientStatus | ''>('');
  const [page, setPage] = useState(1);
  const list = useRecipients({
    campaignId: campaign.id,
    channel,
    status,
    page,
    live: isInFlight(campaign.status),
  });
  const statuses = RECIPIENT_STATUS_BY_CHANNEL[channel];

  return (
    <Panel
      title="Recipients"
      sub="The people this campaign reached, one channel at a time. Addresses are masked by the server."
      flush
      right={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Recipient channel"
            items={campaign.channels.map((value) => ({ value, label: CHANNEL_LABEL[value] }))}
            value={channel}
            onChange={(next) => {
              setChannel(next);
              setStatus('');
              setPage(1);
            }}
          />
          <SelectField
            aria-label="Filter recipients by status"
            value={status}
            options={[
              { value: '', label: 'All statuses' },
              ...statuses.map((value) => ({ value, label: RECIPIENT_STATUS_LOOK[value].label })),
            ]}
            onChange={(event) => {
              setStatus(event.target.value as RecipientStatus | '');
              setPage(1);
            }}
          />
        </div>
      }
    >
      <DataTable
        caption="Campaign recipients"
        columns={COLUMNS}
        rows={list.rows}
        rowKey={(row) => row.id}
        state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
        error={list.query.error}
        errorTitle="Could not load the recipients"
        onRetry={() => void list.query.refetch()}
        pagination={{ page, pageSize: RECIPIENTS_PAGE_SIZE, total: list.total ?? list.rows.length }}
        onPageChange={setPage}
        empty={
          <EmptyState icon="inbox" title="No recipients here">
            {status
              ? 'No message has this status on this channel.'
              : campaign.status === 'draft' || campaign.status === 'scheduled'
                ? 'The recipients appear when the campaign is sent.'
                : 'Nobody was reached on this channel.'}
          </EmptyState>
        }
      />
    </Panel>
  );
}
