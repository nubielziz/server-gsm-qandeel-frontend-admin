// ActionDialogs: the confirm dialogs of the Queues & jobs tab that ask for nothing but a yes: resume a queue, retry the
// failed jobs of a queue (all, or one), run a scheduled job now. Each states its effect before the button (design:
// "Controls and confirmation"). `system:manage` on every route; a dialog answers the write, so errors are not toasted.
import { ConfirmDialog } from '@/components/ui';
import { usePauseQueue, useRetryFailedJobs, useRunJob } from '../../hooks';
import type { QueueDialog } from './dialogState';
import { countOf } from './text';

type Of<K extends QueueDialog['kind']> = Extract<QueueDialog, { kind: K }>;

/** A queue name in a sentence or title: in mono, because the operator may copy or search it. */
function Name({ children }: { children: string }) {
  return <span className="mono">{children}</span>;
}

export interface DialogProps<K extends QueueDialog['kind']> {
  dialog: Of<K>;
  onClose: () => void;
}

/** Resume a paused queue (`POST …/queues/:name/pause` with `paused: false`). */
export function ResumeQueueDialog({ dialog, onClose }: DialogProps<'resume'>) {
  const resume = usePauseQueue({ toastErrors: false });
  const { queue, waiting } = dialog;
  return (
    <ConfirmDialog
      open
      title={
        <>
          Resume <Name>{queue}</Name>?
        </>
      }
      body={
        <p>
          Workers take jobs from <Name>{queue}</Name> again
          {waiting > 0 ? `, starting with the ${countOf(waiting, 'job')} waiting now.` : '.'}
        </p>
      }
      confirm="Resume queue"
      onClose={onClose}
      onConfirm={() => resume.mutateAsync({ queue, body: { paused: false } }).then(() => undefined)}
    />
  );
}

/** Retry every failed job of a queue (`POST …/queues/:name/retry` with `all: true`). */
export function RetryAllDialog({ dialog, onClose }: DialogProps<'retryAll'>) {
  const retry = useRetryFailedJobs({ toastErrors: false });
  const { queue, failed } = dialog;
  return (
    <ConfirmDialog
      open
      title={
        <>
          Retry all failed jobs of <Name>{queue}</Name>?
        </>
      }
      body={
        <p>
          Retries {countOf(failed, 'failed job')} of <Name>{queue}</Name> now. They go back to waiting.
        </p>
      }
      confirm="Retry all failed"
      onClose={onClose}
      onConfirm={() => retry.mutateAsync({ queue, body: { all: true } }).then(() => undefined)}
    />
  );
}

/** Retry one failed job (`POST …/queues/:name/retry` with its `jobId`). */
export function RetryJobDialog({ dialog, onClose }: DialogProps<'retryOne'>) {
  const retry = useRetryFailedJobs({ toastErrors: false });
  const { queue, job } = dialog;
  return (
    <ConfirmDialog
      open
      title={
        <>
          Retry job <Name>{job.id}</Name>?
        </>
      }
      body={
        <p>
          Retries job <Name>{job.id}</Name> of <Name>{queue}</Name> now. It goes back to waiting.
        </p>
      }
      confirm="Retry job"
      onClose={onClose}
      onConfirm={() => retry.mutateAsync({ queue, body: { jobId: job.id } }).then(() => undefined)}
    />
  );
}

/**
 * Run a scheduled job now (`POST …/jobs/:name/run`). The server records the run as manual. The job is named by its label;
 * the contract is assumed, so an empty label falls back to the job's name (title, sentence and the success toast alike).
 */
export function RunJobDialog({ dialog, onClose }: DialogProps<'run'>) {
  const run = useRunJob({ toastErrors: false });
  const { job } = dialog;
  const name = job.label || job.name;
  return (
    <ConfirmDialog
      open
      title={`Run ${name} now?`}
      body={<p>{name} runs now, outside its schedule (recorded as manual).</p>}
      confirm="Run now"
      onClose={onClose}
      onConfirm={() => run.mutateAsync({ job: job.name, label: name }).then(() => undefined)}
    />
  );
}
