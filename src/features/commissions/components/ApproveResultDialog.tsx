// ApproveResultDialog: what a bulk approval did when the server skipped some accruals: how many it approved and paid, and for each
// skipped accrual which one it was and the server's reason. The demo's approval could not fail part-way, so it has no such dialog;
// the API checks every accrual again (like BulkSummaryDialog in the orders feature, MISMATCHES M23).
import { Button, Icon, Modal } from '@/components/ui';
import { money } from '@/lib/format';
import { accrualLabel, agentName, commissionsText } from '../lib/accrual';
import type { ApproveOutcome } from './ApproveDialog';

/** The summary of a partly skipped approval. */
export function ApproveResultDialog({ outcome, onClose }: { outcome: ApproveOutcome; onClose: () => void }) {
  const { result, rows } = outcome;
  const byId = new Map(rows.map((row) => [row.id, row]));
  return (
    <Modal
      open
      title={`${result.approved} of ${commissionsText(rows.length)} approved`}
      sub={`${money(result.total)} was paid into agent wallets. ${result.skipped.length} could not be approved; the server’s reason is shown for each.`}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className="m-0 list-none space-y-2 p-0">
        {result.skipped.map((item) => {
          const row = byId.get(item.id);
          return (
            <li key={item.id} className="flex gap-2 text-sm">
              <Icon name="xCircle" className="ic-sm mt-0.5 flex-none text-crit-fg" />
              <span>
                <span className="mono font-medium">{accrualLabel(item.id)}</span>
                {row && <span className="text-ink2"> · {agentName(row)}</span>}
                <span className="text-ink2"> · {item.reason}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
