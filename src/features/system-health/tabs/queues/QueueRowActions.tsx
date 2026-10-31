// QueueRowActions: the controls at the end of a queue row (or at the foot of its card on a phone): Pause or Resume, Retry
// all failed, the failed-jobs list and the Bull Board link. Pause, Resume and Retry need `system:manage`.
import { Button, Icon } from '@/components/ui';
import { ActionButton, DeepLink } from '../../components';
import type { QueueStats } from '../../types';
import type { QueueDialog } from './dialogState';

export interface QueueRowActionsProps {
  queue: QueueStats;
  onDialog: (dialog: QueueDialog) => void;
  onOpenFailed: (queue: string) => void;
}

/**
 * A fragment on purpose: the table and the phone card each lay the buttons out, and a read-only staff member (no
 * `ActionButton` drawn) leaves the card foot empty so it hides. Each button names its queue for screen readers, because
 * a column of identical "Pause" buttons says nothing about the row.
 */
export function QueueRowActions({ queue, onDialog, onOpenFailed }: QueueRowActionsProps) {
  const { name, paused, waiting, failed } = queue;
  return (
    <>
      <ActionButton
        permission="system:manage"
        size="sm"
        aria-label={`${paused ? 'Resume' : 'Pause'} ${name}`}
        onClick={() =>
          onDialog(paused ? { kind: 'resume', queue: name, waiting } : { kind: 'pause', queue: name })
        }
      >
        <Icon name={paused ? 'play' : 'pause'} className="ic-sm" />
        {paused ? 'Resume' : 'Pause'}
      </ActionButton>
      {failed > 0 && (
        <ActionButton
          permission="system:manage"
          size="sm"
          aria-label={`Retry all failed jobs of ${name}`}
          onClick={() => onDialog({ kind: 'retryAll', queue: name, failed })}
        >
          Retry all failed
        </ActionButton>
      )}
      {failed > 0 && (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Failed jobs of ${name}`}
          onClick={() => onOpenFailed(name)}
        >
          Failed jobs
        </Button>
      )}
      <DeepLink to="bullBoard" path={`queue/${encodeURIComponent(name)}`} variant="button">
        Bull Board<span className="sr-only"> for {name}</span>
      </DeepLink>
    </>
  );
}
