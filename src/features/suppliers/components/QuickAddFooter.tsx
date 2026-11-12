// QuickAddFooter: the buttons under each step of "Quick add…". Cancel and Review, Back and Add, then Close (with a note while the
// run goes on), Add more after a finished run, or Back to groups after a stopped one.
import { Button } from '@/components/ui';
import { isLive } from '../lib/quickAdd';
import type { QuickAddRun } from '../types';

/** The three steps of the dialog. */
export type QuickAddStep = 'groups' | 'review' | 'progress';

export interface QuickAddFooterProps {
  step: QuickAddStep;
  /** The run the third step shows; undefined until it is known. */
  run: QuickAddRun | undefined;
  /** Step 1: something is picked and the picks fit one request. */
  canContinue: boolean;
  /** Step 2: the label of the primary button, "Add 14 services". */
  addLabel: string;
  /** Step 2: false while a big run still needs its tick box. */
  canAdd: boolean;
  /** Step 2: the start request is on its way. */
  adding: boolean;
  onClose: () => void;
  onBack: () => void;
  /** After a finished run: back to the groups with the picks cleared. */
  onMore: () => void;
  /** After a stopped run: back to the groups with the picks kept, to start again. */
  onRestart: () => void;
}

/** The footer of the current step. The primary buttons submit the dialog's form. */
export function QuickAddFooter({
  step,
  run,
  canContinue,
  addLabel,
  canAdd,
  adding,
  onClose,
  onBack,
  onMore,
  onRestart,
}: QuickAddFooterProps) {
  if (step === 'groups') {
    return (
      <>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!canContinue}>
          Review
        </Button>
      </>
    );
  }
  if (step === 'review') {
    return (
      <>
        <Button disabled={adding} onClick={onBack}>
          Back
        </Button>
        <Button type="submit" variant="primary" loading={adding} disabled={!canAdd}>
          {addLabel}
        </Button>
      </>
    );
  }
  return (
    <>
      {run && isLive(run) && (
        <p className="me-auto text-xs text-ink3">
          It keeps running after you close this. Open Quick add again to see it.
        </p>
      )}
      <Button onClick={onClose}>Close</Button>
      {run?.status === 'succeeded' && (
        <Button variant="primary" onClick={onMore}>
          Add more
        </Button>
      )}
      {run?.status === 'failed' && (
        <Button variant="primary" onClick={onRestart}>
          Back to groups
        </Button>
      )}
    </>
  );
}
