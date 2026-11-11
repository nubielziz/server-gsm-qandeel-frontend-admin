// CampaignBadges: the status badge, the purpose badge and the channel icons of a campaign, shared by the list and the detail page. Status is
// never colour alone: every badge carries an icon and a word.
import { Badge, Icon } from '@/components/ui';
import { CHANNEL_ICON, CHANNEL_LABEL, PURPOSE_LABEL, STATUS_LOOK } from '../lib/status';
import type { CampaignChannel, CampaignPurpose, CampaignStatus } from '../types';

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const look = STATUS_LOOK[status];
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {look.label}
    </Badge>
  );
}

export function PurposeBadge({ purpose }: { purpose: CampaignPurpose }) {
  return <Badge tone={purpose === 'marketing' ? 'accent' : 'neutral'}>{PURPOSE_LABEL[purpose]}</Badge>;
}

/** The channels as icons, each with its name for a screen reader and a tooltip. */
export function ChannelIcons({ channels }: { channels: readonly CampaignChannel[] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink2">
      {channels.map((channel) => (
        <span key={channel} title={CHANNEL_LABEL[channel]} className="inline-flex">
          <Icon name={CHANNEL_ICON[channel]} className="ic-sm" />
          <span className="sr-only">{CHANNEL_LABEL[channel]}</span>
        </span>
      ))}
    </span>
  );
}
