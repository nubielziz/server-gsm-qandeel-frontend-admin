// DisputeDialog: a card dispute with its evidence pack. Ports the dp-open dialog of 53-p-refunds.js. While evidence is needed
// it offers the three answers of the demo: Not now, Accept the loss (opens the confirm) and Submit evidence (the ticked lines of
// the pack and an optional note). Any other state is read-only with no footer. A refusal from the server shows in the dialog.
import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Button, dialogSubmit, Modal, TextareaField } from '@/components/ui';
import { ago, lm } from '@/lib/format';
import type { RefundGrants } from '../hooks/useRefundGrants';
import { useDispute } from '../hooks/useRefund';
import { useSubmitEvidence } from '../hooks/useDisputeMutations';
import { disputeLabel, storefrontOrderLabel } from '../lib/labels';
import type { Dispute } from '../types';
import { DisputeBanner } from './DisputeBanner';
import { EvidencePack } from './EvidencePack';

type Values = { note: string };

export interface DisputeDialogProps {
  /** The list row. The dialog reads the dispute again for its evidence pack. */
  dispute: Dispute;
  grants: RefundGrants;
  now: number;
  onClose: () => void;
  /** Swaps this dialog for the "Accept the loss" confirm. */
  onAccept: (dispute: Dispute) => void;
}

export function DisputeDialog({ dispute: row, grants, now, onClose, onAccept }: DisputeDialogProps) {
  const { dispute, query } = useDispute(row);
  const submit = useSubmitEvidence();
  const form = useForm<Values>({ defaultValues: { note: '' } });
  const [failure, setFailure] = useState<string | null>(null);
  // Until the person changes it, the lines that support our case are ticked.
  const [touched, setTouched] = useState<ReadonlySet<string> | null>(null);

  const need = dispute.status === 'needs_response';
  const evidence = dispute.evidence;
  const picked: ReadonlySet<string> =
    touched ?? new Set((evidence ?? []).filter((item) => item.ok).map((item) => item.key));
  const toggle = (key: string) => {
    const next = new Set(picked);
    if (!next.delete(key)) next.add(key);
    setTouched(next);
  };

  // Hint only: the server checks `disputes:manage` and the deadline again.
  const manage = grants.needs('disputes:manage');
  const nothingPicked = picked.size === 0;
  const save = dialogSubmit(
    form,
    async (values) => {
      const note = values.note.trim();
      await submit.mutateAsync({
        dispute,
        body: { items: [...picked], ...(note ? { note } : {}) },
      });
    },
    { fields: ['note'] },
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submit.isPending || !need || !evidence) return;
    setFailure(null);
    const outcome = await save(event);
    if (typeof outcome === 'string') setFailure(outcome);
    else if (outcome) onClose();
  }

  return (
    <Modal
      open
      size="lg"
      title={`${disputeLabel(dispute.id)} · ${dispute.reasonCode}`}
      sub={`${dispute.customer?.name ?? 'Unknown customer'} · ${storefrontOrderLabel(dispute.orderId)} · ${lm(dispute.amount, dispute.currency, dispute.fx)} · opened ${ago(dispute.createdAt, now)}`}
      onClose={onClose}
      dismissible={!submit.isPending}
      error={failure}
      onSubmit={handleSubmit}
      footer={
        need ? (
          <>
            <Button disabled={submit.isPending} onClick={onClose}>
              Not now
            </Button>
            <Button
              variant="danger"
              disabled={manage.disabled || submit.isPending}
              title={manage.title}
              onClick={() => onAccept(dispute)}
            >
              Accept the loss
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submit.isPending}
              disabled={manage.disabled || !evidence || nothingPicked}
              title={manage.title ?? (nothingPicked ? 'Tick at least one line of the pack' : undefined)}
            >
              Submit evidence
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <DisputeBanner dispute={dispute} now={now} />
        <EvidencePack
          dispute={dispute}
          failed={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          picked={picked}
          onToggle={need && !manage.disabled ? toggle : undefined}
        />
        {need && dispute.strength === 'weak' && (
          <p className="text-sm text-ink2">
            The case is weak: little in the pack supports us. Accepting now avoids spending time on a likely
            loss.
          </p>
        )}
        {need && (
          <TextareaField
            label="Note to the card network (optional)"
            rows={2}
            hint="Sent with the evidence. Keep it to the facts."
            error={form.formState.errors.note}
            {...form.register('note')}
          />
        )}
      </div>
    </Modal>
  );
}
