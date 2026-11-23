// GroupsFlowFooter: the buttons of the whole-groups path of the Add services flow: Back and Next while picking, Back and Start before
// the run, then Close (with a note while the run goes on), Add more after a finished run, or Back to groups after a stopped one.
import { Button } from '@/components/ui';
import { isLive } from '../../../lib/quickAdd';
import type { FlowStage } from '../../../lib/quickAddFlow';
import type { QuickAddRun } from '../../../types';

export interface GroupsFlowFooterProps {
  stage: FlowStage;
  /** The run the progress shows; undefined until it is known. */
  run: QuickAddRun | undefined;
  /** Picking: something is picked and the picks fit one request. */
  canNext: boolean;
  /** Before the run: a big run has its tick box. */
  canStart: boolean;
  /** The start request is on its way. */
  adding: boolean;
  /** Start is locked by a permission: the control keeps its reason as the title. */
  startLock: { disabled: boolean; title?: string };
  /** Back one step (to "Where from" while picking, to the picks before the run). */
  onBack: () => void;
  onClose: () => void;
  /** After a finished run: back to the groups with the picks cleared. */
  onMore: () => void;
  /** After a stopped run: back to the groups with the picks kept, to start again. */
  onRestart: () => void;
}

/**
 * The footer of the current stage. The primary buttons submit the dialog's form. Next and Start have their own `key`, so Next is
 * replaced by a new Start button instead of turning into it: a double click or a held Enter on Next cannot start the run.
 */
export function GroupsFlowFooter({
  stage,
  run,
  canNext,
  canStart,
  adding,
  startLock,
  onBack,
  onClose,
  onMore,
  onRestart,
}: GroupsFlowFooterProps) {
  if (stage === 'progress') {
    return (
      <>
        {run && isLive(run) && (
          <p className="me-auto text-xs text-ink3">
            It keeps running after you close this. Open Add services again to see it.
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
  return (
    <>
      <Button disabled={adding} onClick={onBack}>
        Back
      </Button>
      {stage === 'prices' ? (
        <Button key="next" type="submit" variant="primary" disabled={!canNext}>
          Next
        </Button>
      ) : (
        <Button
          key="start"
          type="submit"
          variant="primary"
          loading={adding}
          disabled={!canStart || startLock.disabled}
          title={startLock.title}
        >
          Start
        </Button>
      )}
    </>
  );
}
