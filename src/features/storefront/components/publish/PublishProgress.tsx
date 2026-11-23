// PublishProgress: the run is queued or running: a meter, "12 of 40 services, 10 on the shop", and Stop. The server publishes in
// the background and keeps going after the staff member leaves the page. Stopping needs storefront:publish; rows already
// published stay published.
import { useState } from 'react';
import { Button, ConfirmDialog, Meter } from '@/components/ui';
import { useCancelPublishRun } from '../../hooks/usePublishMutations';
import { progressLine, progressRatio, refusalText } from '../../lib/publish';
import type { PublishRun } from '../../types';

export interface PublishProgressProps {
  run: PublishRun;
  /** The props of a button that needs `storefront:publish`. */
  canStop: { disabled: boolean; title?: string };
}

/** The meter, the line, the note and the Stop button with its confirmation. */
export function PublishProgress({ run, canStop }: PublishProgressProps) {
  const [confirming, setConfirming] = useState(false);
  const cancel = useCancelPublishRun();
  return (
    <div className="space-y-3 py-4">
      {run.status === 'queued' ? (
        <p className="text-sm text-ink2" aria-live="polite">
          Waiting to start…
        </p>
      ) : (
        <>
          <Meter ratio={progressRatio(run)} tone="neutral" label="Publish progress" />
          <p className="text-sm text-ink2" aria-live="polite">
            {progressLine(run)}
          </p>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-xs text-ink3">It keeps running after you leave this page.</p>
        <Button size="sm" onClick={() => setConfirming(true)} {...canStop}>
          Stop
        </Button>
      </div>
      {confirming && (
        <ConfirmDialog
          open
          title="Stop publishing?"
          sub={`Run ${run.id}`}
          confirm="Stop publishing"
          kind="danger"
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            try {
              await cancel.mutateAsync(run.id);
            } catch (failure) {
              return refusalText(failure);
            }
          }}
          body="The services already published stay published. The rest are not published. You can start the rest again with Review the left out."
        />
      )}
    </div>
  );
}
