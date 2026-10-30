// GeneratedDrafts: the second half of the "Generate drafts" dialog: the drafts the server created, so the admin can go and review
// them in the Landing pages list. Nothing here is published.
import { Button, Icon, Modal } from '@/components/ui';
import { kindLabel, pagePath } from '../lib/kinds';
import type { GeneratePagesResult } from '../types';

/** The drafts the generator created, and how many combinations already had a page. */
export function GeneratedDrafts({ result, onClose }: { result: GeneratePagesResult; onClose: () => void }) {
  const { created, skipped } = result;
  return (
    <Modal
      open
      title={created.length === 1 ? '1 draft created' : `${created.length} drafts created`}
      sub={
        skipped > 0
          ? `${skipped} ${skipped === 1 ? 'combination already has' : 'combinations already have'} a page and was skipped.`
          : 'Review each one in the Landing pages list, then publish it.'
      }
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      {created.length === 0 ? (
        <p className="text-sm text-ink2">
          No new drafts. Every combination you asked for already has a page.
        </p>
      ) : (
        <ul className="m-0 max-h-72 list-none divide-y divide-line overflow-auto rounded-md border border-line p-0">
          {created.map((page) => (
            <li key={page.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <Icon name="file" className="ic-sm text-ink3" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{page.title}</span>
                <span className="mono block truncate text-2xs text-ink3">
                  {pagePath(page.kind, page.slug)}
                </span>
              </span>
              <span className="tag">{kindLabel(page.kind)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
