// ApiConnectionPart: the "API Connection" part of a service's edit view: the primary supplier connection and the secondary ones that take the
// orders over, in order. It reads the chain (`GET /admin/services/:id/supplier-links`) and replaces it whole on Save. It takes plain props,
// so any host can mount it; the Product / Services page's edit view mounts it through a thin adapter of the services feature.
import { QueryState, Skeleton } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useServiceSupplierLinks } from '../../hooks/useServiceSupplierLinks';
import type { EditLock } from '../../lib/links';
import { ApiConnectionForm } from './ApiConnectionForm';

export interface ApiConnectionPartProps {
  serviceId: Id;
  /** The service's name, for the toast that follows a save. */
  serviceName: string;
  /** `catalog:update` as the host's grants give it: `{ disabled, title }`. Every change is off without it. */
  canEdit: EditLock;
  /** Says whether the part holds unsaved changes, so the host can ask before another part or view opens. */
  onDirtyChange: (dirty: boolean) => void;
}

function ChainSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading the suppliers">
      <Skeleton height={32} />
      <Skeleton height={32} />
    </div>
  );
}

/**
 * Works for a service that has no connection yet: the chain is then empty and the first supplier is chosen from the menu. It reads the
 * chain again each time it opens and keeps the person's edits while a read refreshes. Saving makes the services lists and the service
 * stale (see `useReplaceLinks`).
 */
export function ApiConnectionPart({
  serviceId,
  serviceName,
  canEdit,
  onDirtyChange,
}: ApiConnectionPartProps) {
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
        <ApiConnectionForm
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
