// ApproveDialog: "Approve N commissions", the review step before money moves. It lists what each agent will receive and says the
// payout cannot be undone. Ports the `modal` of `ca-approve` in 46-p-commissions.js. The server decides which accruals it
// pays; a failed call stays in the dialog with the server's message.
import { ConfirmDialog } from '@/components/ui';
import { money } from '@/lib/format';
import { useApproveAccruals } from '../hooks/useAccrualMutations';
import { agentTotals, commissionsText, totalOf } from '../lib/accrual';
import type { ApproveAccrualsResult, CommissionAccrual } from '../types';

/** What the approval did, with the accruals that were sent (the result dialog names the agent of a skipped one). */
export type ApproveOutcome = { result: ApproveAccrualsResult; rows: readonly CommissionAccrual[] };

export interface ApproveDialogProps {
  rows: readonly CommissionAccrual[];
  onClose: () => void;
  onDone: (outcome: ApproveOutcome) => void;
}

/** The review step and the approval itself. */
export function ApproveDialog({ rows, onClose, onDone }: ApproveDialogProps) {
  const approve = useApproveAccruals();
  const total = money(totalOf(rows));
  return (
    <ConfirmDialog
      open
      title={`Approve ${commissionsText(rows.length)}`}
      sub={`${total} will be paid into agent wallets`}
      confirm={`Approve ${total}`}
      onClose={onClose}
      onConfirm={async () => {
        const result = await approve.mutateAsync(rows.map((row) => row.id));
        onDone({ result, rows });
      }}
      body={
        <>
          <ul className="m-0 list-none divide-y divide-line rounded-md border border-line p-0 text-sm [&>li]:px-3 [&>li]:py-2">
            {agentTotals(rows).map((agent) => (
              <li key={agent.id} className="flex justify-between gap-3">
                <span>{agent.name}</span>
                <span className="font-medium tabular-nums">{money(agent.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Each agent’s wallet is credited now and Commission expense is debited. This can’t be undone. A
            mistake is fixed with a reversing wallet adjustment.
          </p>
        </>
      }
    />
  );
}
