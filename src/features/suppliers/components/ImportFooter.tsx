// ImportFooter: the buttons of the import dialog's two steps. The primary button says how far a long list is while it goes
// 500 at a time ("Previewing 500 of 1,132…"), and offers to Continue after a batch failed.
import { Button } from '@/components/ui';
import { num } from '@/lib/format';
import { runWords, type RunState } from '../lib/importPlan';

export interface ImportFooterProps {
  step: 'pick' | 'preview';
  /** A preview or an import call is going: the dialog cannot be left or sent back. */
  busy: boolean;
  /** The "Select all not imported" box is reading ids: Preview waits for it. */
  selecting: boolean;
  /** How many services are picked (pick step). */
  picked: number;
  /** How many services the import would send (preview step). */
  importable: number;
  /** Where the preview run is, when it is for the services picked now (else null). */
  previewRun: RunState | null;
  /** Where the import run is, when it is for the services of the preview on screen (else null). */
  importRun: RunState | null;
  onClose: () => void;
  onBack: () => void;
}

/** Cancel and Preview on the first step; Back and Import on the second. */
export function ImportFooter({
  step,
  busy,
  selecting,
  picked,
  importable,
  previewRun,
  importRun,
  onClose,
  onBack,
}: ImportFooterProps) {
  if (step === 'pick') {
    return (
      <>
        <Button disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={busy} disabled={picked === 0 || selecting}>
          {runWords('Preview', `Preview${picked > 0 ? ` (${num(picked)})` : ''}`, previewRun)}
        </Button>
      </>
    );
  }
  const plain =
    importable === 0
      ? 'Nothing to import'
      : `Import ${num(importable)} ${importable === 1 ? 'service' : 'services'}`;
  return (
    <>
      <Button disabled={busy} onClick={onBack}>
        Back
      </Button>
      <Button type="submit" variant="primary" loading={busy} disabled={importable === 0}>
        {runWords('Import', plain, importRun)}
      </Button>
    </>
  );
}
