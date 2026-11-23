// ApiConnectionPart: the "API Connection" part of the edit view. The part itself belongs to the suppliers feature (it edits the supplier chain of
// the service); this is the thin adapter that gives it the service and the staff member's permission to change it.
import { ApiConnectionPart as SupplierChainPart } from '@/features/suppliers';
import type { ServicePartProps } from '../../types';

/** The API Connection part: the primary connection and the secondary ones, with every change locked without `catalog:update`. */
export function ApiConnectionPart({ service, grants, onDirtyChange }: ServicePartProps) {
  return (
    <SupplierChainPart
      serviceId={service.id}
      serviceName={service.name}
      canEdit={grants.needs('catalog:update')}
      onDirtyChange={onDirtyChange}
    />
  );
}
