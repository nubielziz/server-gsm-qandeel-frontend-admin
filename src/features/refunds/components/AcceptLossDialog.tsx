// AcceptLossDialog: the danger confirm before a dispute is closed as lost. Ports the dp-accept confirm of 53-p-refunds.js: it
// states the amount and the dispute fee that are recorded as a chargeback loss, and that it cannot be undone. The demo also said
// the customer is blocked; the map's accept writes only the dispute and the ledger, so the dialog points to the customer's page.
import { ConfirmDialog } from '@/components/ui';
import { money, money0 } from '@/lib/format';
import { useAcceptLoss } from '../hooks/useDisputeMutations';
import { disputeLabel } from '../lib/labels';
import type { Dispute } from '../types';

export function AcceptLossDialog({ dispute, onClose }: { dispute: Dispute; onClose: () => void }) {
  const accept = useAcceptLoss();
  return (
    <ConfirmDialog
      open
      title={`Accept the loss on ${disputeLabel(dispute.id)}?`}
      confirm="Accept the loss"
      kind="danger"
      onClose={onClose}
      body={
        <>
          <p>
            {money(dispute.amount)} and the {money0(dispute.fee)} dispute fee are recorded as a chargeback
            loss.
          </p>
          <p className="mt-2">
            This can’t be undone. Blocking the customer is a separate step on their page.
          </p>
        </>
      }
      onConfirm={async () => {
        await accept.mutateAsync(dispute);
      }}
    />
  );
}
