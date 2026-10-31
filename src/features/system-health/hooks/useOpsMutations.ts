// The operator actions of the System health page: maintenance mode, queue retry and pause, a manual job run and the
// integrity check. Each toasts what changed and makes stale the health reads it changes; a refusal is a toast or is
// left to the dialog (`toastErrors`). The dialogs state the effect first (docs/system-health-design.md, Controls).
import { useApiMutation } from '@/lib/query';
import { pauseQueue, retryQueue, runIntegrityCheck, runJob, setMaintenance } from '../api';
import type { JobRun, PauseQueueBody, RetryQueueBody, SetMaintenanceBody } from '../types';
import { healthKey } from './keys';
import {
  errorToast,
  integrityToast,
  maintenanceToast,
  pauseToast,
  retryToast,
  runJobToast,
  type MutationToastOptions,
} from './toasts';

/**
 * Turns maintenance on, changes it, or turns it off (`system:manage`). The health summary carries the maintenance
 * state, so refreshing it updates the header, the verdict and the shell banner together.
 */
export function useSetMaintenance(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: (body: SetMaintenanceBody) => setMaintenance(body),
    invalidateKeys: [healthKey('health')],
    successNotification: (_state, body) => maintenanceToast(body),
    ...errorToast(options),
  });
}

/**
 * Sends one failed job, or all of them, back to waiting (`system:manage`). The toast says how many jobs the server
 * retried. The queue counters and the failed list change.
 */
export function useRetryFailedJobs(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: ({ queue, body }: { queue: string; body: RetryQueueBody }) => retryQueue(queue, body),
    invalidateKeys: [healthKey('queues'), healthKey('failed-jobs')],
    successNotification: (result, { queue }) => retryToast(queue, result.retried),
    ...errorToast(options),
  });
}

/** Pauses a queue (with a reason) or resumes it (`system:manage`). The queue table shows the new state. */
export function usePauseQueue(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: ({ queue, body }: { queue: string; body: PauseQueueBody }) => pauseQueue(queue, body),
    invalidateKeys: [healthKey('queues')],
    successNotification: (_queue, { queue, body }) => pauseToast(queue, body),
    ...errorToast(options),
  });
}

/**
 * Runs a scheduled job now (`system:manage`). `label` is the job's readable name for the toast (the job's `name` is
 * used without it). The job list shows the new run and its history gains a line.
 */
export function useRunJob(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: ({ job }: { job: string; label?: string }) => runJob(job),
    invalidateKeys: [healthKey('jobs')],
    successNotification: (_run, { job, label }) => runJobToast(label ?? job),
    ...errorToast(options),
  });
}

/**
 * Starts the integrity check (`system:manage`). The report flips to `running`, which makes it poll every few seconds,
 * and the run is a new line in the job list.
 */
export function useRunIntegrity(options: MutationToastOptions) {
  return useApiMutation<JobRun, void>({
    mutationFn: () => runIntegrityCheck(),
    invalidateKeys: [healthKey('integrity'), healthKey('jobs')],
    successNotification: () => integrityToast(),
    ...errorToast(options),
  });
}
