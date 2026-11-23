// ApiConnectionForm: the API Connection part once the chain is read: the primary connection, the secondary ones and the pinned Save. It
// keeps the draft, tells the editor when something is unsaved, and replaces the whole chain on Save (`PUT /admin/services/:id/supplier-links`).
import { Button, PartForm, SectionHeading, useReportDirty } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useReplaceLinks } from '../../hooks/useReplaceLinks';
import { useSupplierGrants } from '../../hooks/useSupplierGrants';
import { useSuppliers } from '../../hooks/useSuppliers';
import {
  incompleteStep,
  missingServiceText,
  toLinksBody,
  touchedSupplierIds,
  type EditLock,
} from '../../lib/links';
import type { ChainStep } from '../../types';
import { PrimaryConnection } from './PrimaryConnection';
import { SecondaryConnections } from './SecondaryConnections';
import { useConnectionDraft } from './useConnectionDraft';

export interface ApiConnectionFormProps {
  serviceId: Id;
  serviceName: string;
  /** The chain the server has now. */
  chain: readonly ChainStep[];
  /** What the staff member may do: `catalog:update` for every change, `suppliers:read` on top of it to choose a supplier. */
  canEdit: EditLock;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * A role without `catalog:update` sees the chain with every control off and the reason in its title. A role without `suppliers:read` can
 * still move and remove, but cannot choose a supplier it cannot list. The Save is off until something changed, and a supplier added
 * without its service is refused before any call is made.
 */
export function ApiConnectionForm({
  serviceId,
  serviceName,
  chain,
  canEdit,
  onDirtyChange,
}: ApiConnectionFormProps) {
  const grants = useSupplierGrants();
  const save = useReplaceLinks();
  const draft = useConnectionDraft(chain);
  const addLock = canEdit.disabled ? canEdit : grants.needs('suppliers:read');
  // The supplier list is only read when the person may use it: the menus are off otherwise.
  const { suppliers, status, retry } = useSuppliers({ enabled: !addLock.disabled });
  useReportDirty(!canEdit.disabled && draft.dirty, onDirtyChange);

  // A supplier added without its service is refused before any call, with a sentence for the failure line.
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
    <PartForm label="API Connection" onSubmit={submit} dirty={draft.dirty} lock={canEdit}>
      <SectionHeading as="h3">API Connection</SectionHeading>
      <PrimaryConnection
        steps={draft.steps}
        suppliers={suppliers}
        suppliersStatus={status}
        lock={canEdit}
        addLock={addLock}
        onChoose={draft.setPrimary}
        onPick={draft.pick}
      />
      {!addLock.disabled && status === 'error' && (
        <div className="flex items-center gap-2 pb-2 text-sm text-crit-fg" role="alert">
          <span>Could not load the supplier list.</span>
          <Button size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}
      <SectionHeading as="h3">Secondary API Connections</SectionHeading>
      <SecondaryConnections
        steps={draft.steps}
        suppliers={suppliers}
        suppliersStatus={status}
        lock={canEdit}
        addLock={addLock}
        onAdd={draft.add}
        onMove={draft.move}
        onRemove={draft.remove}
        onPick={draft.pick}
      />
    </PartForm>
  );
}
