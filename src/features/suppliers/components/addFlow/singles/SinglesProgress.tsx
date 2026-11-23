// SinglesProgress: where the import is while it goes 500 services at a time: a bar of the batches the server answered and a line
// saying how far the batch in flight reaches.
import { Meter } from '@/components/ui';
import { num } from '@/lib/format';
import type { RunState } from '../../../lib/importPlan';

/** The bar counts the services of the answered batches; the line is read out politely at each batch. */
export function SinglesProgress({ run }: { run: RunState }) {
  const ratio = run.total > 0 ? run.handled / run.total : 0;
  return (
    <div className="space-y-2">
      <Meter ratio={ratio} tone="neutral" label="Adding services" />
      <p className="text-sm text-ink2" aria-live="polite">
        {run.upTo === null ? 'Adding services…' : `Adding ${num(run.upTo)} of ${num(run.total)}…`}
      </p>
    </div>
  );
}
