// DeleteCampaignDialog: confirms deleting a draft. Only a draft can be deleted: a campaign that was scheduled or sent is kept for history and cancelled instead.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteCampaign } from '../hooks/useCampaignMutations';
import type { CampaignDetail } from '../types';

/** `onDeleted` runs after the draft is gone (the page leaves the campaign it showed). */
export function DeleteCampaignDialog({
  campaign,
  onClose,
  onDeleted,
}: {
  campaign: CampaignDetail;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const remove = useDeleteCampaign();
  return (
    <ConfirmDialog
      open
      kind="danger"
      title="Delete this draft?"
      sub={campaign.name}
      confirm="Delete draft"
      onClose={onClose}
      onConfirm={async () => {
        await remove.mutateAsync(campaign.id);
        onDeleted();
      }}
      body="The draft is removed for good. Nothing was sent."
    />
  );
}
