// ImportDialog: "Import services…": pick services from the supplier's own list, look at what the import would do (Preview), then bring them in
// (Import). Built in the demo's dialog style (the demo only says "Import its catalog"). It sends the new and the changed services, not the
// ones that already match, because those have nothing to do. A long list goes to the server 500 at a time.
import { useState, type FormEvent } from 'react';
import { errorText, Modal, useRowSelection } from '@/components/ui';
import { useImportFilter } from '../hooks/useImportFilter';
import { useImportServices, usePreviewImport } from '../hooks/useImportServices';
import { useSelectAllNotImported } from '../hooks/useSelectAllNotImported';
import { BatchStopped } from '../lib/batches';
import { importableIds, stoppedText } from '../lib/importPlan';
import type { ImportPreviewItem, Supplier } from '../types';
import { ImportFooter } from './ImportFooter';
import { ImportPicker } from './ImportPicker';
import { ImportPreview } from './ImportPreview';

export interface ImportDialogProps {
  supplier: Pick<Supplier, 'id' | 'name'>;
  onClose: () => void;
}

/** What the error slot says for a failed call: how far a long list got before it (when it did), then the server's words. */
function failureText(failure: unknown, verb: 'previewed' | 'imported'): string {
  if (!(failure instanceof BatchStopped)) return errorText(failure);
  return stoppedText(verb, failure, errorText(failure.reason));
}

/** Two steps in one dialog: pick (the list) and preview (what would happen). The picks survive Back. */
export function ImportDialog({ supplier, onClose }: ImportDialogProps) {
  const selection = useRowSelection<number>();
  const filter = useImportFilter();
  const [items, setItems] = useState<ImportPreviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const all = useSelectAllNotImported({
    supplierId: supplier.id,
    q: filter.q,
    group: filter.group,
    selection,
    onError: setError,
  });
  const preview = usePreviewImport(supplier.id);
  const importer = useImportServices(supplier.id);
  const busy = preview.isPending || importer.isPending;
  const picks = [...selection.selected];
  const ids = items ? importableIds(items) : [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || all.busy) return;
    setError(null);
    try {
      if (items === null) {
        setItems(await preview.run(picks));
      } else {
        await importer.run(ids);
        onClose();
      }
    } catch (failure) {
      setError(failureText(failure, items === null ? 'previewed' : 'imported'));
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={`Import services from ${supplier.name}`}
      sub={
        items === null
          ? 'Pick the services to bring into the console. You see what will happen before anything changes.'
          : 'Check the result below. Nothing has changed yet.'
      }
      onClose={onClose}
      dismissible={!busy}
      error={error}
      onSubmit={(event) => void submit(event)}
      footer={
        <ImportFooter
          step={items === null ? 'pick' : 'preview'}
          busy={busy}
          selecting={all.busy}
          picked={picks.length}
          importable={ids.length}
          previewRun={preview.progressFor(picks)}
          importRun={importer.progressFor(ids)}
          onClose={onClose}
          onBack={() => {
            setItems(null);
            setError(null);
            importer.reset();
          }}
        />
      }
    >
      {items === null ? (
        <ImportPicker
          supplierId={supplier.id}
          selection={selection}
          filter={filter}
          all={all}
          locked={busy}
        />
      ) : (
        <ImportPreview items={items} />
      )}
    </Modal>
  );
}
