// LinksDialog: "Edit links…" for one service of the Services table: the ordered chain of suppliers that take its orders. The
// first is the primary, the next ones take over when it is disabled or fails. The demo kept this as two fields on a service
// (primary and fallback); the map keeps ordered links (`PUT /admin/services/:id/supplier-links`). Saving sends the whole chain.
import { useState } from 'react';
import { FormDialog, SelectField, toast } from '@/components/ui';
import { useReplaceLinks } from '../hooks/useReplaceLinks';
import { useSuppliers } from '../hooks/useSuppliers';
import {
  draftFromChain,
  incompleteStep,
  moveStep,
  newStepKey,
  removeStep,
  sameChain,
  toLinksBody,
  type DraftStep,
} from '../lib/links';
import type { SupplierLink, SupplierService } from '../types';
import { LinkRow } from './LinkRow';

export interface LinksDialogProps {
  link: SupplierLink;
  onClose: () => void;
}

/** Edits a draft of the chain; Save links sends it whole. A new supplier needs its service picked before saving. */
export function LinksDialog({ link, onClose }: LinksDialogProps) {
  const { suppliers } = useSuppliers();
  const save = useReplaceLinks();
  const [steps, setSteps] = useState<DraftStep[]>(() => draftFromChain(link.chain));
  const inChain = new Set(steps.map((step) => step.supplierId));
  // Every supplier not yet in the chain is offered; the server decides whether a disabled one may be linked.
  const addable = suppliers.filter((supplier) => !inChain.has(supplier.id));

  function add(supplierId: number) {
    const supplier = suppliers.find((candidate) => candidate.id === supplierId);
    if (!supplier) return;
    setSteps((current) => [
      ...current,
      {
        key: newStepKey(),
        supplierId,
        supplierName: supplier.name,
        supplierServiceId: null,
        supplierServiceName: '',
      },
    ]);
  }

  function pick(key: string, item: SupplierService) {
    setSteps((current) =>
      current.map((step) =>
        step.key === key ? { ...step, supplierServiceId: item.id, supplierServiceName: item.name } : step,
      ),
    );
  }

  async function submit() {
    const missing = incompleteStep(steps);
    if (missing) return `Choose the service at ${missing.supplierName} for the supplier you added.`;
    if (sameChain(steps, link.chain)) {
      toast({ kind: 'info', title: 'Nothing changed' });
      return;
    }
    await save.mutateAsync({
      serviceId: link.serviceId,
      serviceName: link.serviceName,
      body: toLinksBody(steps),
      supplierIds: [...new Set([...link.chain, ...steps].map((step) => step.supplierId))],
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
      <div className="space-y-3">
        {steps.length === 0 ? (
          <p className="rounded-md bg-sunken p-2.5 text-sm text-ink2">
            No supplier is linked. Orders for this service wait for manual dispatch.
          </p>
        ) : (
          <ol className="m-0 list-none space-y-2 p-0" aria-label="Suppliers in order">
            {steps.map((step, index) => (
              <LinkRow
                key={step.key}
                step={step}
                index={index}
                count={steps.length}
                onMove={(from, to) => setSteps((current) => moveStep(current, from, to))}
                onRemove={(position) => setSteps((current) => removeStep(current, position))}
                onPick={pick}
              />
            ))}
          </ol>
        )}
        <SelectField
          label="Add a supplier"
          selectWrapClassName="w-full"
          value=""
          disabled={addable.length === 0}
          options={[
            { value: '', label: addable.length === 0 ? 'No other enabled supplier' : 'Choose a supplier…' },
            ...addable.map((supplier) => ({ value: supplier.id, label: supplier.name })),
          ]}
          onChange={(event) => add(Number(event.target.value))}
        />
      </div>
    </FormDialog>
  );
}
