// PublishActionBar: the sticky bar at the foot of the preview: "Discard this preview" (behind a confirmation) and the primary
// "Publish N services", which opens the confirmation. Discarding needs storefront:create; publishing needs storefront:publish, and
// the button says so when the role lacks it.
import { useState } from 'react';
import { Button, ConfirmDialog } from '@/components/ui';
import { useCancelPublishRun } from '../../hooks/usePublishMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { refusalText, servicesText } from '../../lib/publish';
import type { PublishRun } from '../../types';
import { PublishConfirmDialog } from './PublishConfirmDialog';

export interface PublishActionBarProps {
  run: PublishRun;
  grants: StorefrontGrants;
  /** Goes back to the start of the tab (after the draft is discarded). */
  onClose: () => void;
}

/** The two buttons and their dialogs. */
export function PublishActionBar({ run, grants, onClose }: PublishActionBarProps) {
  const [dialog, setDialog] = useState<'publish' | 'discard' | null>(null);
  const cancel = useCancelPublishRun();
  const publishLock = grants.needs('storefront:publish');
  const discardLock = grants.needs('storefront:create');
  const included = run.counts.included;

  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-surface px-4 py-3">
      <p className="flex-1 text-sm text-ink2">
        {included === 0 ? 'No row is included.' : `${servicesText(included)} will be published.`}
      </p>
      <Button variant="ghost" onClick={() => setDialog('discard')} {...discardLock}>
        Discard this preview
      </Button>
      <Button
        variant="primary"
        disabled={publishLock.disabled || included === 0}
        title={publishLock.title ?? (included === 0 ? 'Include at least one row first.' : undefined)}
        onClick={() => setDialog('publish')}
      >
        Publish {servicesText(included)}
      </Button>
      {dialog === 'publish' && <PublishConfirmDialog run={run} onClose={() => setDialog(null)} />}
      {dialog === 'discard' && (
        <ConfirmDialog
          open
          title="Discard this preview?"
          sub={`Run ${run.id}`}
          confirm="Discard preview"
          kind="danger"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            try {
              await cancel.mutateAsync(run.id);
            } catch (failure) {
              return refusalText(failure);
            }
            onClose();
          }}
          body="Your edits are thrown away. Nothing has been published."
        />
      )}
    </div>
  );
}
