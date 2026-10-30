// DisableDialog: the review step before "Disable supplier…". Ports `supDisable` of 44-p-suppliers.js: new orders for its
// services go to their fallback, services with no fallback wait for manual dispatch, and open orders keep their supplier.
// The counts come from the services shown on the page; they are a hint, and the server decides what happens.
import { ConfirmDialog } from '@/components/ui';
import { useSetSupplierEnabled } from '../hooks/useSupplierMutations';
import type { Supplier, SupplierLink } from '../types';

export interface DisableDialogProps {
  supplier: Supplier;
  /** The services the supplier serves; undefined while they load, and the sentence then has no counts. */
  links: readonly SupplierLink[] | undefined;
  onClose: () => void;
}

/** Asks before disabling and says what it means for the supplier's services, from the services already on the page. */
export function DisableDialog({ supplier, links, onClose }: DisableDialogProps) {
  const disable = useSetSupplierEnabled({ toastErrors: false });
  const primary = links?.filter((link) => link.priority === 1) ?? [];
  const noFallback = primary.filter((link) => link.chain.length <= 1).length;
  return (
    <ConfirmDialog
      open
      title={`Disable ${supplier.name}?`}
      confirm="Disable supplier"
      kind="danger"
      onClose={onClose}
      body={
        <>
          <p>
            {links
              ? `New orders for its ${primary.length} ${primary.length === 1 ? 'service go' : 'services go'} to their fallback supplier.`
              : 'New orders for its services go to their fallback supplier.'}
            {noFallback > 0 && (
              <>
                {' '}
                <strong className="font-medium text-crit-fg">
                  {noFallback} of them {noFallback === 1 ? 'has' : 'have'} no fallback
                </strong>{' '}
                and will wait for manual dispatch.
              </>
            )}{' '}
            Open orders keep their current supplier.
          </p>
          <p className="mt-2">You can enable it again at any time.</p>
        </>
      }
      onConfirm={() => disable.mutateAsync({ supplier, enabled: false }).then(() => undefined)}
    />
  );
}
