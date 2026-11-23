// BulkSummaryDialog: what a bulk action did when some records were refused: how many went through and, for each of the
// others, which record it was and the server's reason. Generic: the caller names the thing ("orders", "services").
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

/** What the summary shows after a bulk action: how many went through and, by name, which ones did not and why. */
export type BulkSummary = {
  /** Past tense that finishes the sentence: "rejected", "switched off". */
  verb: string;
  done: number;
  total: number;
  failed: { label: string; reason: string }[];
};

/** The singular and plural of what the action ran over. */
export type BulkUnit = { one: string; many: string };

const DEFAULT_UNIT: BulkUnit = { one: 'item', many: 'items' };

/**
 * Info-only dialog with one line per refused record. Mount it while a summary exists and clear the summary in `onClose`.
 *
 * @param summary the counts and the refused records, named like the table names them
 * @param unit the noun for the title ("1 order", "12 orders"); defaults to "item" and "items"
 */
export function BulkSummaryDialog({
  summary,
  onClose,
  unit = DEFAULT_UNIT,
}: {
  summary: BulkSummary;
  onClose: () => void;
  unit?: BulkUnit;
}) {
  const { verb, done, total, failed } = summary;
  return (
    <Modal
      open
      title={`${done} of ${total} ${total === 1 ? unit.one : unit.many} ${verb}`}
      sub={`${failed.length} could not be ${verb}. The server's reason is shown for each.`}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className="m-0 list-none space-y-2 p-0">
        {failed.map((item, index) => (
          <li key={`${index}-${item.label}`} className="flex gap-2 text-sm">
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
