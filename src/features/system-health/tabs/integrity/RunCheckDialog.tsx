// RunCheckDialog: the confirm before the integrity check starts (POST /admin/system/integrity/run). It says what the run does
// before the button, and shows the server's refusal (for example a run already going) in the dialog itself.
import { ConfirmDialog } from '@/components/ui';
import { useRunIntegrity } from '../../hooks';
import type { JobRun } from '../../types';

export interface RunCheckDialogProps {
  onClose: () => void;
  /** Called with the run the server started, so the card can say when it began. */
  onStarted: (run: JobRun) => void;
}

/**
 * The check only reads the ledger, so the confirm is light: it states that and nothing else. The mutation toasts the
 * success itself and leaves a refusal to this dialog (`toastErrors: false`), so the error is not shown twice.
 */
export function RunCheckDialog({ onClose, onStarted }: RunCheckDialogProps) {
  const runIntegrity = useRunIntegrity({ toastErrors: false });
  return (
    <ConfirmDialog
      open
      title="Run the integrity check?"
      body={<p>Runs the read-only ledger checks in the background; nothing is corrected.</p>}
      confirm="Run check"
      onClose={onClose}
      onConfirm={async () => {
        // An answer without a body (a 204) is fine: the report then says it is running, only without the start time.
        const run: JobRun | undefined = await runIntegrity.mutateAsync();
        if (run) onStarted(run);
      }}
    />
  );
}
