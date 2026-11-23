// LinksDialog: "Edit links…" for one service of the Services table: the ordered chain of suppliers that take its orders. The
// first is the primary, the next ones take over when it is disabled or fails. The demo kept this as two fields on a service
// (primary and fallback); the map keeps ordered links (`PUT /admin/services/:id/supplier-links`). Saving sends the whole chain.
import { FormDialog, toast } from '@/components/ui';
import { useLinksDraft } from '../hooks/useLinksDraft';
import { useReplaceLinks } from '../hooks/useReplaceLinks';
import { useSuppliers } from '../hooks/useSuppliers';
import { incompleteStep, missingServiceText, toLinksBody, touchedSupplierIds } from '../lib/links';
import type { SupplierLink } from '../types';
import { LinksBody } from './LinksBody';

export interface LinksDialogProps {
  link: SupplierLink;
  onClose: () => void;
}

/** Edits a draft of the chain; Save links sends it whole. A new supplier needs its service picked before saving. */
export function LinksDialog({ link, onClose }: LinksDialogProps) {
  const { suppliers, status, retry } = useSuppliers();
  const save = useReplaceLinks();
  const draft = useLinksDraft(link.chain);

  async function submit() {
    const missing = incompleteStep(draft.steps);
    if (missing) return missingServiceText(missing);
    if (!draft.dirty) {
      toast({ kind: 'info', title: 'Nothing changed' });
      return;
    }
    await save.mutateAsync({
      serviceId: link.serviceId,
      serviceName: link.serviceName,
      body: toLinksBody(draft.steps),
      supplierIds: touchedSupplierIds(link.chain, draft.steps),
    });
  }

  return (
    <FormDialog
      open
      title={`Supplier links for ${link.serviceName}`}
      sub="The first supplier gets the orders. The next ones take over when it is disabled or fails."
      confirm="Save links"
      onClose={onClose}
      onSubmit={submit}
    >
      <LinksBody
        steps={draft.steps}
        suppliers={suppliers}
        lock={{ disabled: false }}
        addLock={{ disabled: false }}
        suppliersStatus={status}
        onRetrySuppliers={retry}
        onAdd={draft.add}
        onMove={draft.move}
        onRemove={draft.remove}
        onPick={draft.pick}
      />
    </FormDialog>
  );
}
