// ImportDialog: "Import services…": pick services from the supplier's own list, look at what the import would do (Preview), then bring them in
// (Import). Built in the demo's dialog style (the demo only says "Import its catalog"). It sends the new and the changed services, not the
// ones that already match, because those have nothing to do.
import { useState, type FormEvent } from 'react';
import { Button, errorText, Modal, useRowSelection } from '@/components/ui';
import { useImportServices, usePreviewImport } from '../hooks/useImportServices';
import { importableIds } from '../lib/importPlan';
import type { ImportPreviewItem, Supplier } from '../types';
import { ImportPicker } from './ImportPicker';
import { ImportPreview } from './ImportPreview';

export interface ImportDialogProps {
  supplier: Pick<Supplier, 'id' | 'name'>;
  onClose: () => void;
}

/** Two steps in one dialog: pick (the list) and preview (what would happen). The picks survive Back. */
export function ImportDialog({ supplier, onClose }: ImportDialogProps) {
  const selection = useRowSelection<number>();
  const [items, setItems] = useState<ImportPreviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = usePreviewImport(supplier.id);
  const importer = useImportServices(supplier.id);
  const busy = preview.isPending || importer.isPending;
  const ids = items ? importableIds(items) : [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    try {
      if (items === null) {
        const answer = await preview.mutateAsync({ supplierServiceIds: [...selection.selected] });
        setItems(answer.items);
      } else {
        await importer.mutateAsync({ supplierServiceIds: ids });
        onClose();
      }
    } catch (failure) {
      setError(errorText(failure));
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
        items === null ? (
          <>
            <Button disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={preview.isPending}
              disabled={selection.selected.size === 0}
            >
              Preview {selection.selected.size > 0 && `(${selection.selected.size})`}
            </Button>
          </>
        ) : (
          <>
            <Button
              disabled={busy}
              onClick={() => {
                setItems(null);
                setError(null);
              }}
            >
              Back
            </Button>
            <Button type="submit" variant="primary" loading={importer.isPending} disabled={ids.length === 0}>
              {ids.length === 0
                ? 'Nothing to import'
                : `Import ${ids.length} ${ids.length === 1 ? 'service' : 'services'}`}
            </Button>
          </>
        )
      }
    >
      {items === null ? (
        <ImportPicker supplierId={supplier.id} selection={selection} />
      ) : (
        <ImportPreview items={items} />
      )}
    </Modal>
  );
}
