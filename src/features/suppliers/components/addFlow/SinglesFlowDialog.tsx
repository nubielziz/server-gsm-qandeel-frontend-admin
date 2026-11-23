// SinglesFlowDialog: the "Single services" path of the Add services flow (steps 2 and 3): pick the supplier's services and see the
// server's preview with its suggested price per row, then start the import and, if asked, a shop preview for each batch.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Modal, Steps, useRowSelection } from '@/components/ui';
import { servicesText } from '../../lib/quickAdd';
import { useImportFilter } from '../../hooks/useImportFilter';
import { usePreviewImport } from '../../hooks/useImportServices';
import { useSelectAllNotImported } from '../../hooks/useSelectAllNotImported';
import { useSinglesImport } from '../../hooks/useSinglesImport';
import { useSinglesShopSwitch } from '../../hooks/useSinglesShopRule';
import { useSupplierGrants } from '../../hooks/useSupplierGrants';
import { countItems, failureText, importableIds, previewSummary } from '../../lib/importPlan';
import { addStoppedText, isRefusal, sentOf, stoppedSub, totalOf } from '../../lib/singlesFlow';
import type { ImportPreviewItem } from '../../types';
import { ImportPicker } from '../ImportPicker';
import { ImportPreview } from '../ImportPreview';
import { SinglesFinish } from './singles/SinglesFinish';
import { SinglesFooter, type SinglesStage } from './singles/SinglesFooter';
import { SinglesResult } from './singles/SinglesResult';
import { StepHeading } from './StepHeading';
import { ADD_FLOW_STEPS, type AddFlowPathProps } from './types';

const SUBS: Record<SinglesStage, string> = {
  pick: 'Pick the services to add. You see what will happen before anything changes.',
  preview: 'Check the prices below. Nothing has changed yet.',
  finish: 'Choose what happens next, then start.',
};

/** What the step is called for a screen reader; focus lands on it when the step changes. */
const HEADINGS: Record<SinglesStage, string> = {
  pick: 'Pick the services to add',
  preview: 'Check the prices',
  finish: 'Finish: add the services',
};

/**
 * Steps 2 and 3 of the flow for single services. The picker and the preview are the step "Prices and category" (the server's own
 * suggested price per row; the console works out none); the last screen is "Finish". The import goes 500 services at a time and
 * keeps the answer of every batch, also when a later batch fails; `onDone` is called once when services were added. After a batch
 * failed for good, Back returns to the picks: the batches that went through stay on screen as "Already added" (and in the result
 * of the next run), and the services they brought in leave the picks.
 */
export function SinglesFlowDialog({ supplier, onBack, onClose, onDone }: AddFlowPathProps) {
  const selection = useRowSelection<number>();
  const filter = useImportFilter();
  const [stage, setStage] = useState<SinglesStage>('pick');
  const [items, setItems] = useState<ImportPreviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prepare, setPrepare] = useState(false);
  const [ended, setEnded] = useState(false);
  const [done, setDone] = useState(false);
  // The import stopped because the server refused the list itself, not because a call failed in passing.
  const [refused, setRefused] = useState(false);
  const lock = useSupplierGrants().needs('catalog:create');
  const shop = useSinglesShopSwitch();
  const all = useSelectAllNotImported({
    supplierId: supplier.id,
    q: filter.q,
    group: filter.group,
    selection,
    onError: setError,
  });
  const preview = usePreviewImport(supplier.id);
  const importer = useSinglesImport(supplier.id, prepare && !shop.blocked);
  const running = preview.isPending || importer.isPending;
  // Asking again for a shop preview holds the dialog too: it must not close or go back under a call that is on its way.
  const busy = running || importer.retrying !== null;
  const picks = [...selection.selected];
  const ids = items ? importableIds(items) : [];
  const outcomes = importer.answers;
  const earlier = importer.earlier;
  // The run stopped part-way (not going, not done, some batches answered). `ended` is set only when the run's call has finished.
  const stopped = stage === 'finish' && ended && !running && !done && outcomes.length > 0;

  // The page behind is told once, as soon as a run that ended had added services (a failed run that added some counts too).
  const told = useRef(false);
  useEffect(() => {
    if (!ended || told.current || !outcomes.some((outcome) => outcome.result.created > 0)) return;
    told.current = true;
    onDone?.();
  }, [ended, outcomes, onDone]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || all.busy) return;
    setError(null);
    setRefused(false);
    try {
      if (stage === 'pick') {
        setItems(await preview.run(picks));
        setStage('preview');
      } else if (stage === 'preview') {
        setStage('finish');
      } else {
        setEnded(false);
        try {
          await importer.run(ids);
          setDone(true);
        } finally {
          setEnded(true);
        }
      }
    } catch (failure) {
      if (stage === 'finish') {
        setRefused(isRefusal(failure));
        setError(addStoppedText(failure));
      } else setError(failureText(failure, 'previewed'));
    }
  }

  function back() {
    if (stage === 'finish') {
      // After a stop with batches answered (or a refusal of the list) the picks are made again: the answered batches are kept, and
      // the services they brought in leave the picks, so they are not previewed again. The words of the stop stay on screen: they
      // name what to untick.
      if (outcomes.length > 0 || refused) {
        selection.setMany(ids.slice(0, sentOf(outcomes)), false);
        if (outcomes.length > 0) importer.keep();
        else importer.reset();
        setItems(null);
        setStage('pick');
        return;
      }
      setError(null);
      importer.reset();
      setStage('preview');
      return;
    }
    setError(null);
    if (stage === 'preview') {
      setItems(null);
      setStage('pick');
    } else {
      onBack();
    }
  }

  let sub = SUBS[stage];
  if (stage === 'finish' && done) sub = 'Done.';
  else if (stage === 'finish' && importer.isPending)
    sub = 'Adding the services. Keep this window open until it ends.';
  else if (stopped) sub = stoppedSub(totalOf(outcomes), refused);

  return (
    <Modal
      open
      size="lg"
      title="Add services"
      sub={`From ${supplier.name}. ${sub}`}
      onClose={onClose}
      dismissible={!busy}
      backdropCloses={false}
      error={error}
      onSubmit={(event) => void submit(event)}
      footer={
        <SinglesFooter
          stage={stage}
          busy={busy}
          selecting={all.busy}
          picked={picks.length}
          importable={ids.length}
          previewRun={preview.progressFor(picks)}
          importRun={importer.progressFor(ids)}
          began={outcomes.length > 0}
          done={done}
          lock={lock}
          onBack={back}
          onClose={onClose}
        />
      }
    >
      <StepHeading step={stage}>{HEADINGS[stage]}</StepHeading>
      <Steps steps={ADD_FLOW_STEPS} current={stage === 'finish' ? 'finish' : 'prices'} className="mb-4" />
      {stage === 'pick' && earlier.length > 0 && (
        <section aria-label="Already added" className="mb-3 space-y-2 rounded-md border border-line p-3">
          <h4 className="text-sm font-semibold">Already added in this window</h4>
          <SinglesResult
            outcomes={earlier}
            total={sentOf(earlier)}
            onNavigate={onClose}
            onRetry={(line) => void importer.retryShop(line)}
            retrying={importer.retrying}
          />
        </section>
      )}
      {stage === 'pick' && (
        <ImportPicker
          supplierId={supplier.id}
          selection={selection}
          filter={filter}
          all={all}
          locked={busy}
        />
      )}
      {stage === 'preview' && items && (
        <div className="space-y-3">
          <ImportPreview items={items} />
          <p className="text-xs text-ink3">
            New services are added on sale at the suggested price. A service whose cost changed only gets its
            new cost.
          </p>
        </div>
      )}
      {stage === 'finish' && items && (
        <SinglesFinish
          summary={`Ready to add ${servicesText(ids.length)} from ${supplier.name}: ${previewSummary({ ...countItems(items), matching: 0 })}.`}
          hasChanged={countItems(items).changed > 0}
          prepare={prepare && !shop.blocked}
          onPrepare={setPrepare}
          shop={shop}
          run={importer.progressFor(ids)}
          outcomes={outcomes}
          earlier={earlier}
          total={ids.length}
          onNavigate={onClose}
          onRetry={(line) => void importer.retryShop(line)}
          retrying={importer.retrying}
        />
      )}
    </Modal>
  );
}
