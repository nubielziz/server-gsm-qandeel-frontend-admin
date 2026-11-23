// PublishActionBar: the buttons of the pinned bar at the foot of the preview: "Discard this preview" (behind a confirmation) and the primary
// "Publish N services", which opens the confirmation. It is drawn inside the footer pager's first row (`FooterPager actions`), so the
// bar and the pager are one bar. Discarding needs storefront:create; publishing needs storefront:publish, and the button says so when the
// role lacks it.
import { useState } from 'react';
import { Button, ConfirmDialog } from '@/components/ui';
import { useCancelPublishRun, useRereadPublishRun } from '../../hooks/usePublishMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { isConflict, refusalText, servicesText } from '../../lib/publish';
import type { PublishRun } from '../../types';
import { PublishConfirmDialog } from './PublishConfirmDialog';

export interface PublishActionBarProps {
  run: PublishRun;
  grants: StorefrontGrants;
  /** Goes back to the start of the tab (after the draft is discarded). */
  onClose: () => void;
  /** Called once a publish was accepted (see `PublishConfirmDialog`). */
  onApplied?: () => void;
}

/** The line, the two buttons and their dialogs, as the children of a bar row. */
export function PublishActionBar({ run, grants, onClose, onApplied }: PublishActionBarProps) {
  const [dialog, setDialog] = useState<'publish' | 'discard' | null>(null);
  const cancel = useCancelPublishRun();
  const reread = useRereadPublishRun();
  const publishLock = grants.needs('storefront:publish');
  const discardLock = grants.needs('storefront:create');
  const included = run.counts.included;

  return (
    <>
      <Button
        variant="primary"
        disabled={publishLock.disabled || included === 0}
        title={publishLock.title ?? (included === 0 ? 'Include at least one row first.' : undefined)}
        onClick={() => setDialog('publish')}
      >
        Publish {servicesText(included)}
      </Button>
      <Button variant="ghost" onClick={() => setDialog('discard')} {...discardLock}>
        Discard this preview
      </Button>
      <p className="text-sm text-ink2">
        {included === 0 ? 'No row is included.' : `${servicesText(included)} will be published.`}
      </p>
      {dialog === 'publish' && (
        <PublishConfirmDialog run={run} onClose={() => setDialog(null)} onApplied={onApplied} />
      )}
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
              if (isConflict(failure)) reread(run.id);
              return refusalText(failure);
            }
            onClose();
          }}
          body="Your edits are thrown away. Nothing has been published."
        />
      )}
    </>
  );
}
