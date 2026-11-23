// Step 1 of the Add services flow, "Where from": a kit Modal with the step line and the two choices, a connected supplier (then whole
// groups or single services) or a service of my own. It owns no state; the frame hands it what is marked and what to do on each choice.
import { useId } from 'react';
import { Button, Modal, Steps } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { SupplierGrants } from '../../hooks/useSupplierGrants';
import type { Supplier } from '../../types';
import { ADD_FLOW_STEPS } from './types';
import { CATALOG_CREATE, type AddFlowFrom } from './addFlowChoice';
import { FromSupplier, ListSkeleton, type SuppliersList } from './FromSupplier';

/** What step 1 needs: the same as the first choice, plus "A service of my own" and the close. */
export interface WhereFromStepProps {
  grants: SupplierGrants;
  list: SuppliersList;
  /** The supplier that is marked and can be chosen. */
  marked: Supplier | undefined;
  /** A line about the supplier the opening address named, when it cannot start the flow. */
  notice: string | undefined;
  onMark: (id: Id) => void;
  /** "Whole groups" or "Single services" for the marked supplier. */
  onPick: (from: AddFlowFrom) => void;
  /** "A service of my own": the frame's host closes the flow and opens the New service form. */
  onOwnService: () => void;
  onClose: () => void;
}

/** The "Where from" dialog. The step line names step 1 as the current one; the path dialogs that follow draw steps 2 and 3 themselves. */
export function WhereFromStep({
  grants,
  list,
  marked,
  notice,
  onMark,
  onPick,
  onOwnService,
  onClose,
}: WhereFromStepProps) {
  const ownId = useId();
  const own = grants.needs(CATALOG_CREATE);
  return (
    <Modal
      open
      size="lg"
      title="Add services"
      sub="Add services from a supplier, or create one of your own."
      onClose={onClose}
      footer={<Button onClick={onClose}>Cancel</Button>}
    >
      <Steps steps={ADD_FLOW_STEPS} current="from" className="mb-4" />
      {/* Nothing is drawn as locked before the permissions are known. */}
      {grants.ready ? (
        <>
          <FromSupplier
            grants={grants}
            list={list}
            marked={marked}
            notice={notice}
            onMark={onMark}
            onPick={onPick}
          />
          <section aria-labelledby={ownId} className="mt-5 space-y-2 border-t border-line pt-4">
            <h3 id={ownId} className="text-base font-semibold">
              Not from a supplier
            </h3>
            <p className="text-sm text-ink2">
              Create a service by hand, for example one you sell without a supplier.
            </p>
            <Button disabled={own.disabled} title={own.title} onClick={onOwnService}>
              A service of my own
            </Button>
          </section>
        </>
      ) : (
        <ListSkeleton />
      )}
    </Modal>
  );
}
