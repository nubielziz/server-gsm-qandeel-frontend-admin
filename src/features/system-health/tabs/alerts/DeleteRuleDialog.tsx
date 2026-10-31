// DeleteRuleDialog: the confirm before an alert rule is deleted (`DELETE /admin/alert-rules/:id`, `alerts:delete`). It
// states the effect before the button. A refusal of the server shows in the dialog. No demo page.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteAlertRule } from '../../hooks';
import type { AlertRule } from '../../types';

export interface DeleteRuleDialogProps {
  rule: AlertRule;
  onClose: () => void;
}

/** Deleting is final, so the dialog says so, names the open alert if there is one, and points to the gentler choices. */
export function DeleteRuleDialog({ rule, onClose }: DeleteRuleDialogProps) {
  const remove = useDeleteAlertRule({ toastErrors: false });
  return (
    <ConfirmDialog
      open
      title="Delete rule?"
      kind="danger"
      confirm="Delete rule"
      onClose={onClose}
      body={
        <div className="space-y-2">
          <p>
            <span className="font-medium text-ink">{rule.name}</span> stops alerting for good and cannot be
            brought back. To alert on it again you would create a new rule.
          </p>
          {rule.open && <p>An alert of this rule is open now.</p>}
          <p className="text-ink3">
            If you only need quiet for a while, mute the rule or switch it off instead.
          </p>
        </div>
      }
      onConfirm={() => remove.mutateAsync(rule.id).then(() => undefined)}
    />
  );
}
