// BulkSummaryDialog: what a bulk action did when some orders were refused: how many went through, and for each of the others
// which order it was and the server's reason. The demo's bulk actions could not fail, so it has no such dialog; the API
// checks every order again (MISMATCHES M23).
import { Button, Icon, Modal } from '@/components/ui';
import { ordersText, type BulkSummary } from '../lib/bulk';

export function BulkSummaryDialog({ summary, onClose }: { summary: BulkSummary; onClose: () => void }) {
  const { verb, done, total, failed } = summary;
  return (
    <Modal
      open
      title={`${done} of ${ordersText(total)} ${verb}`}
      sub={`${failed.length} could not be ${verb}. The server's reason is shown for each.`}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className="m-0 list-none space-y-2 p-0">
        {failed.map((item) => (
          <li key={item.label} className="flex gap-2 text-sm">
            <Icon name="xCircle" className="ic-sm mt-0.5 flex-none text-crit-fg" />
            <span>
              <span className="mono font-medium">{item.label}</span>
              <span className="text-ink2"> · {item.reason}</span>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
