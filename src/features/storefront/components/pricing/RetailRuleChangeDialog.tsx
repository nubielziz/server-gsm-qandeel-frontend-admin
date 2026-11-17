// RetailRuleChangeDialog: the review before a rule is deleted, turned off or turned on. Each one moves the prices that follow rules,
// so the dialog opens on the server's preview of that change (what it would do, nothing stored) and the staff member confirms
// what they have read. The figures are the server's; the words around them say what happens to the prices that follow the rule.
import { ConfirmDialog, errorText } from '@/components/ui';
import { useDeleteRetailRule, useRetailRulePreview, useUpdateRetailRule } from '../../hooks/useRetailPricing';
import { atFloorText, noRuleText, previewSummary, ruleTargetName } from '../../lib/retailPricing';
import type { RetailPriceRule, RetailRuleChange, RetailRulePreview } from '../../types';
import { RetailPreviewLines } from './RetailPreviewLines';

export interface RetailRuleChangeDialogProps {
  rule: RetailPriceRule;
  /** `toggle` turns an active rule off and an inactive one on. */
  action: 'toggle' | 'delete';
  onClose: () => void;
}

/** The words of the dialog for each change: its title, what it does to the prices and the confirm button. */
function wordsOf(rule: RetailPriceRule, action: 'toggle' | 'delete') {
  const target = ruleTargetName(rule);
  if (action === 'delete') {
    return {
      title: 'Delete this rule?',
      what: `The rule for ${target} is deleted. The prices that follow it move to the next rule that covers them. To keep the rule for later, turn it off instead.`,
      confirm: 'Delete rule',
    };
  }
  return rule.isActive
    ? {
        title: 'Turn this rule off?',
        what: `The rule for ${target} stops pricing the shop. The prices that follow it move to the next rule that covers them.`,
        confirm: 'Turn rule off',
      }
    : {
        title: 'Turn this rule on?',
        what: `The rule for ${target} prices the shop again. Prices it covers move to it within about two minutes.`,
        confirm: 'Turn rule on',
      };
}

/** What the server says the change would do, in the dialog's words. */
function Effect({ preview }: { preview: RetailRulePreview }) {
  if (preview.following === 0)
    return <p>No price follows a rule that this change reaches, so no price moves.</p>;
  return (
    <div className="space-y-2">
      <p className="font-medium">{previewSummary(preview)}</p>
      {preview.atFloor > 0 && <p className="text-warn-fg">{atFloorText(preview.atFloor)}</p>}
      {preview.noRule > 0 && <p>{noRuleText(preview.noRule)}</p>}
      {preview.lines.length > 0 && <RetailPreviewLines lines={preview.lines} />}
    </div>
  );
}

/** Reads the preview, shows it, and confirms with a change of the rule. */
export function RetailRuleChangeDialog({ rule, action, onClose }: RetailRuleChangeDialogProps) {
  const change: RetailRuleChange =
    action === 'delete'
      ? { kind: 'delete', id: rule.id }
      : { kind: 'update', id: rule.id, rule: { isActive: !rule.isActive } };
  const preview = useRetailRulePreview(change);
  const remove = useDeleteRetailRule();
  const update = useUpdateRetailRule();
  const words = wordsOf(rule, action);

  const confirm = async () => {
    // Nothing is written until the staff member has seen what it does.
    if (preview.isLoading) return 'Still checking what this changes. Try again in a moment.';
    if (!preview.data) return 'The preview did not load. Close this window and try again.';
    if (action === 'delete') await remove.mutateAsync(rule);
    else await update.mutateAsync({ rule, body: { isActive: !rule.isActive } });
  };

  return (
    <ConfirmDialog
      open
      title={words.title}
      sub={rule.label}
      confirm={words.confirm}
      kind={action === 'delete' ? 'danger' : 'primary'}
      error={preview.isError ? errorText(preview.error) : null}
      onClose={onClose}
      onConfirm={confirm}
      body={
        <div className="space-y-3">
          <p>{words.what}</p>
          {preview.isLoading && <p className="text-ink3">Checking what this changes…</p>}
          {preview.data && <Effect preview={preview.data} />}
        </div>
      }
    />
  );
}
