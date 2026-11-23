// SuppliersSectionForm: the editable chain inside the Suppliers section of the Catalog panel, once the chain is read. It keeps the draft,
// tells the panel when there is something unsaved, and saves the whole chain through a FormSection (the panel stays open).
import { FormSection } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useDirtyReport } from '../hooks/useDirtyReport';
import { useLinksDraft } from '../hooks/useLinksDraft';
import { useReplaceLinks } from '../hooks/useReplaceLinks';
import { useSupplierGrants } from '../hooks/useSupplierGrants';
import { useSuppliers } from '../hooks/useSuppliers';
import {
  incompleteStep,
  missingServiceText,
  toLinksBody,
  touchedSupplierIds,
  type EditLock,
} from '../lib/links';
import type { ChainStep } from '../types';
import { LinksBody } from './LinksBody';

export interface SuppliersSectionFormProps {
  serviceId: Id;
  serviceName: string;
  /** The chain the server has now. */
  chain: readonly ChainStep[];
  /** What the staff member may do: `catalog:update` for every change, `suppliers:read` on top of it to add a supplier. */
  canEdit: EditLock;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * The places in order, the "Add a supplier" menu and Save links. A role without `catalog:update` sees the chain with every control off
 * and the reason in its title. A role without `suppliers:read` can still move and remove, but cannot pick a supplier it cannot list.
 */
export function SuppliersSectionForm({
  serviceId,
  serviceName,
  chain,
  canEdit,
  onDirtyChange,
}: SuppliersSectionFormProps) {
  const grants = useSupplierGrants();
  const save = useReplaceLinks();
  const draft = useLinksDraft(chain);
  const addLock = canEdit.disabled ? canEdit : grants.needs('suppliers:read');
  // The supplier list is only read when the person may use it: the menu is off otherwise.
  const { suppliers, status, retry } = useSuppliers({ enabled: !addLock.disabled });
  useDirtyReport(!canEdit.disabled && draft.dirty, onDirtyChange);

  async function submit() {
    const missing = incompleteStep(draft.steps);
    if (missing) return missingServiceText(missing);
    await save.mutateAsync({
      serviceId,
      serviceName,
      body: toLinksBody(draft.steps),
      supplierIds: touchedSupplierIds(chain, draft.steps),
    });
  }

  return (
    <>
      <p className="mb-3 text-xs text-ink3">
        The first supplier gets the orders. The next ones take over when it is disabled or fails.
      </p>
      <FormSection
        onSubmit={submit}
        submitLabel="Save links"
        savedText="Links saved"
        dirty={draft.dirty}
        submitDisabled={canEdit.disabled}
        submitTitle={canEdit.title}
      >
        <LinksBody
          steps={draft.steps}
          suppliers={suppliers}
          lock={canEdit}
          addLock={addLock}
          suppliersStatus={status}
          onRetrySuppliers={retry}
          onAdd={draft.add}
          onMove={draft.move}
          onRemove={draft.remove}
          onPick={draft.pick}
        />
      </FormSection>
    </>
  );
}
