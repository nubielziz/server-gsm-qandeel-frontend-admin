// CampaignStats: the figures of one campaign in a StatGrid (expected people, people reached, then the delivery numbers of each chosen channel), and a
// meter for how many of the planned messages are done. The numbers are the server's, live: the page asks again while the campaign is being sent.
import { Meter, StatGrid, type StatCell } from '@/components/ui';
import { num } from '@/lib/format';
import { plannedText } from '../lib/audienceText';
import { isInFlight } from '../lib/status';
import { progressOf } from '../lib/timeline';
import type { CampaignDetail } from '../types';

function cellsOf(campaign: CampaignDetail): StatCell[] {
  const { delivery, channels } = campaign;
  const cells: StatCell[] = [
    {
      label: 'Expected',
      value: campaign.expectedRecipients === null ? '–' : num(campaign.expectedRecipients),
      sub: 'People when it was sent or scheduled',
    },
    { label: 'Recipients', value: num(campaign.recipients), sub: plannedText(campaign.planned) },
  ];
  if (channels.includes('in_app')) {
    cells.push({
      label: 'In-app',
      value: `${num(delivery.inApp.delivered)} delivered`,
      sub: `${num(delivery.inApp.read)} read`,
    });
  }
  if (channels.includes('email')) {
    cells.push({
      label: 'Email',
      value: `${num(delivery.email.sent)} sent`,
      sub: `${num(delivery.email.queued)} waiting, ${num(delivery.email.failed)} failed`,
    });
  }
  return cells;
}

export function CampaignStats({ campaign }: { campaign: CampaignDetail }) {
  const progress = progressOf(campaign);
  const showProgress = progress.planned > 0 || isInFlight(campaign.status);
  return (
    <>
      <StatGrid cells={cellsOf(campaign)} label="Campaign figures" />
      {showProgress && (
        <div className="panel mb-4 p-3.5">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">Delivery progress</span>
            <span className="text-ink3" aria-live="polite">
              {progress.planned > 0
                ? `${num(progress.done)} of ${num(progress.planned)} messages done`
                : 'Waiting for the worker to make the messages'}
            </span>
          </div>
          <Meter
            ratio={progress.ratio}
            tone={campaign.status === 'failed' ? 'crit' : 'neutral'}
            label="Delivery progress"
          />
        </div>
      )}
    </>
  );
}
