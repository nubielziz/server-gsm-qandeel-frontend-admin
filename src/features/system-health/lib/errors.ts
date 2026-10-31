// Tells a 403 from other failures of a health query, so a card can show its "forbidden" state. The 503 check lives with
// the hooks (`isMonitoringUnavailable` in ../hooks/monitoring.ts).
import { isApiError } from '@/lib/api';

/** 403: the staff member lacks the permission this card reads with. */
export function isForbiddenError(error: unknown): boolean {
  return isApiError(error) && error.status === 403;
}
