// SuppliersSection: the "Suppliers" section of the Catalog service panel: the ordered supplier chain of ONE service (primary first,
// then the fallbacks), read from `GET /admin/services/:id/supplier-links` and saved whole with `PUT` on the same address. The panel
// draws the section's heading and frame.
import { QueryState, Skeleton } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useServiceSupplierLinks } from '../hooks/useServiceSupplierLinks';
import type { EditLock } from '../lib/links';
import { SuppliersSectionForm } from './SuppliersSectionForm';

export interface SuppliersSectionProps {
  serviceId: Id;
  /** The service's name, for the toast that follows a save. */
  serviceName: string;
  /** `catalog:update` as the page's grants give it: `{ disabled, title }`. Moving, removing and adding are off without it. */
  canEdit: EditLock;
  /** Says whether the chain holds unsaved changes, so the panel can ask before it closes or changes service. */
  onDirtyChange: (dirty: boolean) => void;
}

function ChainSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading the suppliers">
      <Skeleton height={48} />
      <Skeleton height={48} />
    </div>
  );
}

/**
 * Works for a service that has no link yet: the chain is then empty and the first supplier is added from the menu. It reads the
 * chain again each time it opens, and keeps the person's edits while the read refreshes. Saving makes the Catalog table and the
 * services stale (see `useReplaceLinks`).
 */
export function SuppliersSection({ serviceId, serviceName, canEdit, onDirtyChange }: SuppliersSectionProps) {
  const chain = useServiceSupplierLinks(serviceId);
  return (
    <QueryState
      isLoading={chain.isLoading}
      // A refresh that fails must not throw away the chain on screen or the edits made on it.
      isError={chain.isError && chain.data === undefined}
      error={chain.error}
      onRetry={() => void chain.refetch()}
      errorTitle="Could not load the suppliers"
      skeleton={<ChainSkeleton />}
    >
      {chain.data && (
        <SuppliersSectionForm
          serviceId={serviceId}
          serviceName={serviceName}
          chain={chain.data}
          canEdit={canEdit}
          onDirtyChange={onDirtyChange}
        />
      )}
    </QueryState>
  );
}
