// Which confirm dialog of the Queues & jobs tab is open. The tab holds one value of this type, so the queue table, the
// failed-jobs drawer and the job table all open the same dialogs and only one is ever on screen.
import type { FailedJob, ScheduledJob } from '../../types';

export type QueueDialog =
  /** Pause a queue: asks for a reason. */
  | { kind: 'pause'; queue: string }
  /** Resume a paused queue. `waiting` is how many jobs are queued at that moment, for the effect line. */
  | { kind: 'resume'; queue: string; waiting: number }
  /** Retry every failed job of a queue. `failed` is the count the staff member saw. */
  | { kind: 'retryAll'; queue: string; failed: number }
  /** Retry one failed job. */
  | { kind: 'retryOne'; queue: string; job: Pick<FailedJob, 'id' | 'name'> }
  /** Run a scheduled job now. */
  | { kind: 'run'; job: Pick<ScheduledJob, 'name' | 'label'> };
