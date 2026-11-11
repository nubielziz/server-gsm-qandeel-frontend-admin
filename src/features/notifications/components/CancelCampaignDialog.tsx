// CancelCampaignDialog: confirms stopping a scheduled, queued or sending campaign. Nothing more is made, messages not yet sent fail with a reason and its in-app
// items are hidden; what already went out cannot be taken back.
import { ConfirmDialog } from '@/components/ui';
import { useCancelCampaign } from '../hooks/useCampaignMutations';
import type { CampaignDetail } from '../types';

export function CancelCampaignDialog({
  campaign,
  onClose,
}: {
  campaign: CampaignDetail;
  onClose: () => void;
}) {
  const cancel = useCancelCampaign();
  const running = campaign.status === 'queued' || campaign.status === 'sending';
  return (
    <ConfirmDialog
      open
      kind="danger"
      title="Cancel this campaign?"
      sub={campaign.name}
      confirm="Cancel campaign"
      cancel="Keep it"
      onClose={onClose}
      onConfirm={async () => {
        await cancel.mutateAsync(campaign.id);
      }}
      body={
        running
          ? 'Nothing more is made. Messages not yet sent fail with "The campaign was cancelled." and its in-app items are hidden. Messages that already went out cannot be taken back.'
          : 'The campaign will not go out. It stays in the list as cancelled.'
      }
    />
  );
}
