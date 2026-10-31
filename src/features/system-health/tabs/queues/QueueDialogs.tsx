// QueueDialogs: shows the one confirm dialog of the Queues & jobs tab that `dialog` names, or nothing. The dialogs mount
// only while open, so every opening starts with empty fields and a fresh request state.
import { ResumeQueueDialog, RetryAllDialog, RetryJobDialog, RunJobDialog } from './ActionDialogs';
import type { QueueDialog } from './dialogState';
import { PauseQueueDialog } from './PauseQueueDialog';

export interface QueueDialogsProps {
  dialog: QueueDialog | null;
  onClose: () => void;
}

export function QueueDialogs({ dialog, onClose }: QueueDialogsProps) {
  if (dialog === null) return null;
  switch (dialog.kind) {
    case 'pause':
      return <PauseQueueDialog queue={dialog.queue} onClose={onClose} />;
    case 'resume':
      return <ResumeQueueDialog dialog={dialog} onClose={onClose} />;
    case 'retryAll':
      return <RetryAllDialog dialog={dialog} onClose={onClose} />;
    case 'retryOne':
      return <RetryJobDialog dialog={dialog} onClose={onClose} />;
    case 'run':
      return <RunJobDialog dialog={dialog} onClose={onClose} />;
  }
}
