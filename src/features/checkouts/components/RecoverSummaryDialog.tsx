// RecoverSummaryDialog: what a send did when the server left some checkouts out: how many emails went out, and for each reason how
// many checkouts were skipped. The demo's send could not be refused; the API checks consent and "once only" again (MISMATCHES M1).
import { Button, Icon, Modal } from '@/components/ui';
import { groupSkipped, summaryTitle } from '../lib/recovery';
import type { RecoverCheckoutsResult } from '../types';

export function RecoverSummaryDialog({
  result,
  onClose,
}: {
  result: RecoverCheckoutsResult;
  onClose: () => void;
}) {
  const groups = groupSkipped(result.skipped);
  return (
    <Modal
      open
      title={summaryTitle(result)}
      sub="The server checks every checkout again before it sends: a recovery email goes once, and only to customers who agreed to marketing email."
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className="mb-3 flex items-center gap-2 text-sm">
        <Icon name="checkCircle" className="ic-sm flex-none text-good-fg" />
        <span className="font-medium">
          {result.sent} {result.sent === 1 ? 'email' : 'emails'} sent
        </span>
      </p>
      <ul className="m-0 list-none space-y-2 p-0" aria-label="Skipped checkouts">
        {groups.map((group) => (
          <li key={group.reason} className="flex gap-2 text-sm">
            <Icon name="xCircle" className="ic-sm mt-0.5 flex-none text-ink3" />
            <span>
              <span className="font-medium">
                {group.ids.length} {group.ids.length === 1 ? 'checkout' : 'checkouts'} skipped:
              </span>{' '}
              {group.text}
              <span className="block text-2xs text-ink3">{group.ids.map((id) => `CK-${id}`).join(', ')}</span>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
