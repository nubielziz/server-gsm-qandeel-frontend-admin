// PublishPreview: the draft of a run, the preview staff review before anything is published. THE SEAM OF SLICE C3: this file holds
// only a placeholder that says the preview is ready and what it holds; C3 replaces the component (same name, same props) with the
// stat grid, the toolbar with Check again, the table, the row dialog, the bulk actions and the confirm dialog.
import type { PublishRun } from '../../types';
import { servicesText } from '../../lib/publish';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';

export interface PublishPreviewProps {
  run: PublishRun;
  grants: StorefrontGrants;
  /** Goes to another run ("Check again" makes one). */
  onOpen: (runId: number) => void;
  /** Goes back to the start of the tab (after the draft is discarded). */
  onClose: () => void;
}

/** Placeholder: the draft's figures as one line. */
export function PublishPreview({ run }: PublishPreviewProps) {
  const { ready, review, blocked, included } = run.counts;
  return (
    <div className="px-3.5 py-4" aria-label="Publish preview">
      <p className="text-sm">
        The preview of {servicesText(run.total)} is ready: {ready} ready, {review} need a look, {blocked}{' '}
        cannot be published, {included} will be published.
      </p>
    </div>
  );
}
