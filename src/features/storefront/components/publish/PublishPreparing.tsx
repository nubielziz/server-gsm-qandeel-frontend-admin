// PublishPreparing: the run is a preview being prepared by the server: a spinner line with the number of services, and Cancel.
// The page reads the run again every 1.5 seconds and moves on by itself when the preview is ready.
import { Button, Icon } from '@/components/ui';
import { useCancelPublishRun } from '../../hooks/usePublishMutations';
import { refusalText, servicesText } from '../../lib/publish';
import type { PublishRun } from '../../types';

export interface PublishPreparingProps {
  run: PublishRun;
  /** Needs `storefront:create`: the staff member who prepares a preview may discard it. */
  canCancel: { disabled: boolean; title?: string };
  /** Goes back to the start of the tab. */
  onClose: () => void;
}

/** "Preparing the preview of 60 services…" and the Cancel button. */
export function PublishPreparing({ run, canCancel, onClose }: PublishPreparingProps) {
  const cancel = useCancelPublishRun();
  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
      <p className="flex flex-1 items-center gap-2 text-sm text-ink2" role="status" aria-live="polite">
        <Icon name="loader" className="ic-sm animate-spin" />
        Preparing the preview of {servicesText(run.total)}…
      </p>
      <Button
        size="sm"
        loading={cancel.isPending}
        onClick={() => cancel.mutate(run.id, { onSuccess: onClose })}
        {...canCancel}
      >
        Cancel
      </Button>
      {cancel.isError && (
        <p className="w-full text-sm text-crit-fg" role="alert">
          {refusalText(cancel.error)}
        </p>
      )}
    </div>
  );
}
