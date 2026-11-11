// SendCampaignDialog: "Send to 48,213 people now?". It asks the server for a fresh count when it opens, shows the channel split and who is left out, and
// sends with the number the staff member saw (`confirmRecipients`). When the audience changed meanwhile the server answers 409 CONFLICT: the dialog shows
// its sentence, reads the count again and asks for another confirmation with the new number.
import { ConfirmDialog, errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { useAudiencePreview } from '../hooks/useAudiencePreview';
import { useSendCampaign } from '../hooks/useCampaignMutations';
import { byChannelText, byTypeText, exclusionLines, plural } from '../lib/audienceText';
import { fmtDate } from '@/lib/format';
import type { CampaignDetail } from '../types';

export function SendCampaignDialog({ campaign, onClose }: { campaign: CampaignDetail; onClose: () => void }) {
  const preview = useAudiencePreview({
    audience: campaign.audience,
    channels: campaign.channels,
    purpose: campaign.purpose,
  });
  const send = useSendCampaign();
  const data = preview.data;
  // A count that is being read again (after a refusal) must not be confirmed by mistake.
  const settled = data !== undefined && !preview.isFetching;

  async function confirm() {
    if (!settled) return 'Wait for the count, then send.';
    if (data.reachable === 0) return 'Nobody can be reached with this audience and these channels.';
    try {
      await send.mutateAsync({ id: campaign.id, body: { confirmRecipients: data.reachable } });
    } catch (error) {
      if (isApiError(error) && error.code === 'CONFLICT') {
        await preview.refetch();
        return `${error.detail ?? error.title} The count above is the new one: press Send again to confirm it.`;
      }
      throw error;
    }
  }

  return (
    <ConfirmDialog
      open
      title={data ? `Send to ${plural(data.reachable, 'person', 'people')} now?` : 'Send now?'}
      sub={campaign.name}
      confirm="Send now"
      onClose={onClose}
      onConfirm={confirm}
      body={
        preview.isError ? (
          <p className="text-crit-fg" role="alert">
            {errorText(preview.error)}
          </p>
        ) : !data ? (
          <p>Counting who this reaches…</p>
        ) : (
          <div className="space-y-2" aria-busy={!settled || undefined}>
            <p>
              {byTypeText(data.byType)}. {byChannelText(data.byChannel, campaign.channels)}.
            </p>
            {exclusionLines(data.excluded).length > 0 && (
              <ul className="list-disc space-y-0.5 ps-5">
                {exclusionLines(data.excluded).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {campaign.status === 'scheduled' && campaign.scheduledAt && (
              <p>This sends it now instead of at {fmtDate(campaign.scheduledAt)}.</p>
            )}
            <p className="font-medium text-ink">
              Sending cannot be undone. Messages that went out cannot be taken back.
            </p>
          </div>
        )
      }
    />
  );
}
