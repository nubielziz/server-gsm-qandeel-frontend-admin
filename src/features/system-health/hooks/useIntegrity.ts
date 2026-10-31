// Read of the Integrity tab: the four ledger checks, their findings and the last run.
import { getIntegrity } from '../api';
import { healthKey, POLL } from './keys';
import { useHealthQuery } from './useHealthQuery';

/**
 * The integrity report. It polls every 30 seconds, and every 5 seconds while the server says a run is in progress
 * (`running`), so the result shows up soon after the job finishes.
 */
export function useIntegrity(enabled = true) {
  return useHealthQuery({
    key: healthKey('integrity'),
    read: getIntegrity,
    poll: (report) => (report?.running ? POLL.running : POLL.normal),
    enabled,
  });
}
