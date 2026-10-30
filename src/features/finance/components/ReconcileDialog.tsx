// ReconcileDialog: the answer of "Run reconciliation": no differences, or the accounts whose stored balance is not what their
// entries add up to. New (MISMATCHES M128); it replaces the demo's integrity checks. The server worked out every figure.
import { Button, Icon, Modal } from '@/components/ui';
import { fmtDate, money, num } from '@/lib/format';
import { accountName } from '../lib/accounts';
import type { ReconcileResult } from '../types';

export function ReconcileDialog({ result, onClose }: { result: ReconcileResult; onClose: () => void }) {
  const found = result.differences.length;
  return (
    <Modal
      open
      size="lg"
      title={found === 0 ? 'Reconciliation finished' : 'Reconciliation found differences'}
      sub={`Checked ${num(result.accountsChecked)} accounts and ${num(result.entriesChecked)} entries · ${fmtDate(result.ranAt)}`}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {found === 0 ? (
        <div className="flex gap-2 rounded-md bg-good-bg p-2.5 text-sm text-good-fg" role="status">
          <Icon name="checkCircle" className="mt-px flex-none" />
          <span>No differences. Every account matches the entries behind it.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 rounded-md bg-crit-bg p-2.5 text-sm text-crit-fg" role="alert">
            <Icon name="alert" className="mt-px flex-none" />
            <span>
              {found} {found === 1 ? 'account differs' : 'accounts differ'} from{' '}
              {found === 1 ? 'its' : 'their'} entries.
            </span>
          </div>
          <div className="tbl-wrap max-h-[320px]">
            <table className="tbl" aria-label="Accounts that differ">
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col" className="num">
                    Stored
                  </th>
                  <th scope="col" className="num">
                    From entries
                  </th>
                  <th scope="col" className="num">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.differences.map((difference) => (
                  <tr key={difference.accountId}>
                    <td className="font-medium">
                      {accountName(difference.kind)}
                      {difference.ownerName && <span className="text-ink3"> · {difference.ownerName}</span>}
                      <span className="mono ms-2 text-2xs text-ink3">#{difference.accountId}</span>
                    </td>
                    <td className="num">{money(difference.stored)}</td>
                    <td className="num">{money(difference.expected)}</td>
                    <td className="num text-crit-fg">{money(difference.difference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
