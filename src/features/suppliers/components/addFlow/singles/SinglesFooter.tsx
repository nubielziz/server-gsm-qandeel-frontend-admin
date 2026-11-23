// SinglesFooter: the buttons of the single-services path: Back and Preview on the picker, Back and Next on the preview, Back and
// Start on the last step (then Back, Close and "Continue adding" after a batch failed, or Done when it is all done). The primary
// button of each step is its own element (its own key), so a second press on one step's button cannot land on the next one's.
import { Button } from '@/components/ui';
import { num } from '@/lib/format';
import { runWords, type RunState } from '../../../lib/importPlan';

/** The three screens of steps 2 and 3: the picker and the preview are both "Prices and category". */
export type SinglesStage = 'pick' | 'preview' | 'finish';

export interface SinglesFooterProps {
  stage: SinglesStage;
  /** A preview or an import call is going: nothing can be left or sent back. */
  busy: boolean;
  /** The "Select all not imported" box is reading ids: Preview waits for it. */
  selecting: boolean;
  /** How many services are picked. */
  picked: number;
  /** How many services the import would send. */
  importable: number;
  /** Where the preview run is, when it is for the services picked now (else null). */
  previewRun: RunState | null;
  /** Where the import run is, when it is for the services of the preview on screen (else null). */
  importRun: RunState | null;
  /**
   * At least one batch of the import was answered: the run stopped part-way, so the footer offers Close and "Continue adding", and
   * Back, which returns to the picks (the dialog keeps the answered batches).
   */
  began: boolean;
  /** Every batch was answered. */
  done: boolean;
  /** Preview and Start need `catalog:create` (the grants hook's `needs`): disabled, with the missing permission as the title. */
  lock: { disabled: boolean; title?: string };
  onBack: () => void;
  onClose: () => void;
}

/**
 * Back and the primary button of a screen; the primary button is the form's submit. Each step's button has its own `key`: when Next
 * turns into Start the old button goes and a new one is mounted, so a double click or a held Enter on Next cannot press Start.
 */
export function SinglesFooter({
  stage,
  busy,
  selecting,
  picked,
  importable,
  previewRun,
  importRun,
  began,
  done,
  lock,
  onBack,
  onClose,
}: SinglesFooterProps) {
  if (stage === 'finish' && done) {
    return (
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    );
  }
  const left =
    stage === 'finish' && began ? (
      <>
        <Button disabled={busy} onClick={onBack}>
          Back
        </Button>
        <Button disabled={busy} onClick={onClose}>
          Close
        </Button>
      </>
    ) : (
      <Button disabled={busy} onClick={onBack}>
        Back
      </Button>
    );
  if (stage === 'pick') {
    return (
      <>
        {left}
        <Button
          key="preview"
          type="submit"
          variant="primary"
          loading={busy}
          disabled={picked === 0 || selecting || lock.disabled}
          title={lock.title}
        >
          {runWords('Preview', `Preview${picked > 0 ? ` (${num(picked)})` : ''}`, previewRun)}
        </Button>
      </>
    );
  }
  if (stage === 'preview') {
    return (
      <>
        {left}
        <Button key="next" type="submit" variant="primary" disabled={importable === 0}>
          {importable === 0 ? 'Nothing to add' : 'Next'}
        </Button>
      </>
    );
  }
  return (
    <>
      {left}
      <Button
        key="start"
        type="submit"
        variant="primary"
        loading={busy}
        disabled={lock.disabled}
        title={lock.title}
      >
        {runWords('Add', 'Start', importRun)}
      </Button>
    </>
  );
}
