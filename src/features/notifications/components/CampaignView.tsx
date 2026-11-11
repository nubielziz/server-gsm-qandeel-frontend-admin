// CampaignView: one campaign laid out: header with the actions, the figures and progress, the message preview, the audience and the timeline, and the
// recipients. It owns which dialog and which composer (Edit or Duplicate) is open; each piece draws itself and the dialogs call the API through hooks.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ButtonLink, Panel, Timeline } from '@/components/ui';
import type { BroadcastGrants } from '../hooks/useBroadcastGrants';
import { campaignLogPath, campaignPath } from '../lib/filters';
import { timelineOf } from '../lib/timeline';
import type { CampaignDetail } from '../types';
import { CampaignAudience } from './CampaignAudience';
import { CampaignComposer } from './CampaignComposer';
import { CampaignContent } from './CampaignContent';
import { CampaignDialogs, type CampaignDialogName } from './CampaignDialogs';
import { CampaignHeader, type CampaignAction } from './CampaignHeader';
import { CampaignRecipients } from './CampaignRecipients';
import { CampaignStats } from './CampaignStats';

export function CampaignView({ campaign, grants }: { campaign: CampaignDetail; grants: BroadcastGrants }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<CampaignDialogName | null>(null);
  const [composer, setComposer] = useState<'edit' | 'duplicate' | null>(null);

  const act = (action: CampaignAction) =>
    action === 'edit' || action === 'duplicate' ? setComposer(action) : setDialog(action);

  return (
    <>
      <CampaignHeader campaign={campaign} grants={grants} onAction={act} />
      {campaign.error && (
        <p className="mb-4 rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert">
          {campaign.error}
        </p>
      )}
      <CampaignStats campaign={campaign} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CampaignContent campaign={campaign} />
        <div className="space-y-4">
          <CampaignAudience campaign={campaign} grants={grants} />
          <Panel
            title="Timeline"
            right={
              grants.can('notifications:read') && campaign.status !== 'draft' ? (
                <ButtonLink size="sm" to={campaignLogPath(campaign.id)}>
                  Open in the log
                </ButtonLink>
              ) : undefined
            }
          >
            <Timeline events={timelineOf(campaign)} />
          </Panel>
        </div>
      </div>
      <div className="mt-4">
        <CampaignRecipients campaign={campaign} />
      </div>
      <CampaignDialogs campaign={campaign} open={dialog} onClose={() => setDialog(null)} />
      <CampaignComposer
        open={composer !== null}
        campaign={campaign}
        duplicate={composer === 'duplicate'}
        onClose={() => setComposer(null)}
        // An edit stays on this page (the detail refreshes); a duplicate is a new draft, which opens.
        onSaved={(saved) => {
          if (saved.id !== campaign.id) void navigate(campaignPath(saved.id));
        }}
      />
    </>
  );
}
