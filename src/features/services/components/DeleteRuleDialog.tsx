// DeleteRuleDialog: "Delete this rule?" with a review step. Ports `cat-off` of 43-p-services.js, which removed the rule at once;
// a rule is a pricing decision, so the console asks first and says what changes.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteRule } from '../hooks/usePricingRules';
import { appliesToText, KIND_LABEL } from '../lib/rules';
import type { PricingRule } from '../types';

/** The review step before a rule is deleted. */
export function DeleteRuleDialog({ rule, onClose }: { rule: PricingRule; onClose: () => void }) {
  const remove = useDeleteRule();
  return (
    <ConfirmDialog
      open
      title="Delete this rule?"
      body={
        <p>
          The {KIND_LABEL[rule.kind].toLowerCase()} rule for {appliesToText(rule)} is removed. New orders use
          the base price and the other rules. Open orders keep the price they were given. To keep the rule for
          later, turn it off instead.
        </p>
      }
      confirm="Delete rule"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(rule).then(() => undefined)}
    />
  );
}
