// CampaignHeader: the campaign's title row: name, status, purpose and channels, and the actions its status and the staff member's role allow: Edit,
// Send test, Schedule (Reschedule), Send now, Cancel, Duplicate and Delete. Hidden or disabled buttons are hints: the server decides.
import { Button, Icon, PageHeader, type IconName } from '@/components/ui';
import type { BroadcastGrants } from '../hooks/useBroadcastGrants';
import { canCancel, canDelete, canEdit, canSend, canSendTest } from '../lib/status';
import type { CampaignDetail } from '../types';
import { CampaignStatusBadge, ChannelIcons, PurposeBadge } from './CampaignBadges';

/** What a header button asks the page to do. */
export type CampaignAction = 'edit' | 'duplicate' | 'test' | 'send' | 'schedule' | 'cancel' | 'delete';

export interface CampaignHeaderProps {
  campaign: CampaignDetail;
  grants: BroadcastGrants;
  onAction: (action: CampaignAction) => void;
}

export function CampaignHeader({ campaign, grants, onAction }: CampaignHeaderProps) {
  const lock = grants.needs('broadcasts:send');
  const { status } = campaign;
  const button = (action: CampaignAction, label: string, icon: IconName, variant?: 'primary' | 'danger') => (
    <Button variant={variant} onClick={() => onAction(action)} {...lock}>
      <Icon name={icon} className="ic-sm" />
      {label}
    </Button>
  );
  return (
    <PageHeader
      title={campaign.name}
      sub={
        <span className="inline-flex flex-wrap items-center gap-2">
          <CampaignStatusBadge status={status} />
          <PurposeBadge purpose={campaign.purpose} />
          <ChannelIcons channels={campaign.channels} />
          <span>Created by {campaign.createdBy.name}</span>
        </span>
      }
      actions={
        // Without the send permission the page is read only: no write action is offered, and the server would refuse each one.
        grants.canSend && (
          <>
            {canEdit(status) && button('edit', 'Edit', 'edit')}
            {canSendTest(status) && button('test', 'Send test', 'mail')}
            {canSend(status) &&
              button('schedule', status === 'scheduled' ? 'Reschedule' : 'Schedule', 'clock')}
            {canSend(status) && button('send', 'Send now', 'send', 'primary')}
            {canCancel(status) && button('cancel', 'Cancel campaign', 'ban', 'danger')}
            {button('duplicate', 'Duplicate', 'copy')}
            {canDelete(status) && button('delete', 'Delete', 'x', 'danger')}
          </>
        )
      }
    />
  );
}
