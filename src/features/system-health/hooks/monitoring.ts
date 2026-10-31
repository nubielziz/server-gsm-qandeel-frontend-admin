// Tells "the monitoring system is down" apart from every other failure, so a card can say "Monitoring unavailable" in
// neutral instead of showing an error (docs/system-health-design.md, States).
import { isApiError } from '@/lib/api';

/** The problem code the server sends with a 503 when Prometheus or Sentry cannot be reached. */
export const MONITORING_UNAVAILABLE = 'MONITORING_UNAVAILABLE';

/**
 * True for a 503 with the code `MONITORING_UNAVAILABLE`: the data exists, but the monitoring backend could not be asked.
 * The card then shows its neutral "Monitoring unavailable" state with the server's detail, never green and never a
 * red error. Any other failure (500, 403, network) stays an error. It returns a plain boolean on purpose: a type
 * guard would narrow a different `ApiError` to `never` in the false branch.
 */
export function isMonitoringUnavailable(error: unknown): boolean {
  return isApiError(error) && error.status === 503 && error.code === MONITORING_UNAVAILABLE;
}
