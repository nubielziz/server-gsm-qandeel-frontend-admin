// CampaignsTable: the campaign list with the plan's columns (name, purpose, channels, status, recipients, when, created by). It only draws what it is
// given: the page owns the data, the page number and the empty state. A row opens the campaign; the name is a link so the keyboard has a way in.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { DataTable, type DataTableColumn, type PaginationState } from '@/components/ui';
import { ago, fmtDate, num } from '@/lib/format';
import { campaignPath, PAGE_SIZE } from '../lib/filters';
import { recipientCount, whenOf } from '../lib/status';
import type { Campaign } from '../types';
import { CampaignStatusBadge, ChannelIcons, PurposeBadge } from './CampaignBadges';

export interface CampaignsTableProps {
  rows: readonly Campaign[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (campaign: Campaign) => void;
  empty: ReactNode;
}

export function CampaignsTable({
  rows,
  state,
  error,
  onRetry,
  now,
  page,
  total,
  onPageChange,
  onOpen,
  empty,
}: CampaignsTableProps) {
  const pagination: PaginationState = { page, pageSize: PAGE_SIZE, total };
  const columns: DataTableColumn<Campaign>[] = [
    {
      key: 'name',
      label: 'Campaign',
      render: (campaign) => (
        <Link to={campaignPath(campaign.id)} className="font-medium hover:underline">
          {campaign.name}
        </Link>
      ),
    },
    {
      key: 'purpose',
      label: 'Purpose',
      hide: 'md',
      render: (campaign) => <PurposeBadge purpose={campaign.purpose} />,
    },
    {
      key: 'channels',
      label: 'Channels',
      hide: 'sm',
      render: (campaign) => <ChannelIcons channels={campaign.channels} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (campaign) => <CampaignStatusBadge status={campaign.status} />,
    },
    {
      key: 'recipients',
      label: 'Recipients',
      num: true,
      render: (campaign) => {
        const count = recipientCount(campaign);
        return count === null ? <span className="text-ink3">–</span> : num(count);
      },
    },
    {
      key: 'when',
      label: 'When',
      hide: 'sm',
      render: (campaign) => {
        const when = whenOf(campaign);
        return (
          <>
            <p className="text-ink2">
              {when.label} {fmtDate(when.at)}
            </p>
            <p className="text-2xs text-ink3">{ago(when.at, now)}</p>
          </>
        );
      },
    },
    {
      key: 'by',
      label: 'Created by',
      hide: 'lg',
      render: (campaign) => <span className="text-ink2">{campaign.createdBy.name}</span>,
    },
  ];
  return (
    <DataTable
      caption="Notification campaigns"
      columns={columns}
      rows={rows}
      rowKey={(campaign) => campaign.id}
      onRowClick={onOpen}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the campaigns"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
