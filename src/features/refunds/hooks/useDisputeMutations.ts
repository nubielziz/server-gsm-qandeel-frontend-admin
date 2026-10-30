// The two ways to answer a card dispute, each with the toast the demo showed and the reads it makes stale. Ports the toasts of
// dp-submit and dp-accept in 53-p-refunds.js. Both run inside a dialog, which shows a refusal in its own error slot.
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { acceptDispute, submitDisputeEvidence } from '../api';
import { disputeLabel } from '../lib/labels';
import type { Dispute, SubmitEvidenceBody } from '../types';
import { STALE_KEYS, staleDispute } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Sends the chosen lines of the evidence pack, with an optional note, to the card network. */
export function useSubmitEvidence() {
  return useApiMutation({
    mutationFn: ({ dispute, body }: { dispute: Dispute; body: SubmitEvidenceBody }) =>
      submitDisputeEvidence(dispute.id, body),
    invalidates: (_result, { dispute }) => staleDispute(dispute),
    invalidateKeys: STALE_KEYS,
    onSuccess: (_result, { dispute }) => {
      toast({
        kind: 'success',
        title: 'Evidence submitted',
        body: `${disputeLabel(dispute.id)} is now with the card network. You will be told the result.`,
        ttl: 3600,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Accepts the loss: the dispute closes as lost and the amount and fee are recorded as a chargeback loss. */
export function useAcceptLoss() {
  return useApiMutation({
    mutationFn: (dispute: Dispute) => acceptDispute(dispute.id),
    invalidates: (_result, dispute) => staleDispute(dispute),
    invalidateKeys: STALE_KEYS,
    onSuccess: (_result, dispute) => {
      toast({
        kind: 'info',
        title: `${disputeLabel(dispute.id)} closed as lost`,
        body: 'The loss is recorded as a chargeback loss.',
        ttl: 3200,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}
