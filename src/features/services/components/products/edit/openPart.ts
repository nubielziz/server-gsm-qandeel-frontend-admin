// openPart: which part of the edit view is open, for the two components that need it (ServiceEditor holds the part's unsaved mark,
// OpenService draws the part): the parts the role may see, and the one the address names, or the first one when it names none (or one the
// role may not see).
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import type { ServicePartId } from '../../../lib/productsPath';
import { visibleParts } from '../../../lib/serviceParts';
import type { ServiceDetail } from '../../../types';

/**
 * The parts the role may see and the one that is open. `scope` names that part of that service: one unsaved mark and one start per scope.
 * Side effects: none.
 */
export function openPart(service: ServiceDetail, part: ServicePartId | null, grants: ServiceGrants) {
  const parts = visibleParts(grants, service);
  const current = parts.find((candidate) => candidate.id === part) ?? parts[0];
  return { parts, current, scope: `${service.id}:${current?.id ?? ''}` };
}
