// OldestWaiting: the age of the oldest waiting item of a queue or of a webhook direction, in the Queues table and the
// Webhooks card of the Queues & jobs tab (route group `health`). One rule for both, so an idle line reads alike everywhere.
import { MeasureValue } from '../../components';
import type { Measure } from '../../types';

export interface OldestWaitingProps {
  /** The age the server measured, with its state. */
  measure: Measure;
  /** True when the server's own numbers say nothing waits (no queued job, no undelivered message). */
  none: boolean;
}

/**
 * When nothing waits and the server calls the age fine, "None waiting" says it better than "0s". Any other state, and a
 * missing value, still prints the measure with its icon or its "No data", so a problem is never hidden behind that
 * sentence. The caller says what "nothing waits" means for its row; this decides nothing from the age itself.
 */
export function OldestWaiting({ measure, none }: OldestWaitingProps) {
  if (none && measure.state === 'ok') return <span className="text-ink3">None waiting</span>;
  return <MeasureValue measure={measure} />;
}
