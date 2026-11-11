// CampaignDialogs: shows the one dialog of a campaign that is open (send, schedule, test, cancel, delete). Each is mounted only while open, so every opening
// starts fresh: a new count, an empty time, no old error.
import { useNavigate } from 'react-router';
import { notificationsListPath } from '../lib/filters';
import type { CampaignDetail } from '../types';
import { CancelCampaignDialog } from './CancelCampaignDialog';
import { DeleteCampaignDialog } from './DeleteCampaignDialog';
import { ScheduleCampaignDialog } from './ScheduleCampaignDialog';
import { SendCampaignDialog } from './SendCampaignDialog';
import { TestSendDialog } from './TestSendDialog';

/** The dialogs a header button can open. */
export type CampaignDialogName = 'send' | 'schedule' | 'test' | 'cancel' | 'delete';

export interface CampaignDialogsProps {
  campaign: CampaignDetail;
  open: CampaignDialogName | null;
  onClose: () => void;
}

export function CampaignDialogs({ campaign, open, onClose }: CampaignDialogsProps) {
  const navigate = useNavigate();
  switch (open) {
    case 'send':
      return <SendCampaignDialog campaign={campaign} onClose={onClose} />;
    case 'schedule':
      return <ScheduleCampaignDialog campaign={campaign} onClose={onClose} />;
    case 'test':
      return <TestSendDialog campaign={campaign} onClose={onClose} />;
    case 'cancel':
      return <CancelCampaignDialog campaign={campaign} onClose={onClose} />;
    case 'delete':
      return (
        <DeleteCampaignDialog
          campaign={campaign}
          onClose={onClose}
          onDeleted={() => void navigate(notificationsListPath())}
        />
      );
    default:
      return null;
  }
}
