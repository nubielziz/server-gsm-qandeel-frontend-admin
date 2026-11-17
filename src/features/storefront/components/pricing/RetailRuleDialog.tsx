// RetailRuleDialog: "New rule" and "Edit rule" for a retail pricing rule, in two steps like the bulk price change. Step one is the
// form; Preview asks the server what the rule would do to the prices that follow rules (`POST /admin/retail-price-rules/preview`);
// step two shows that answer and Save the rule writes it (`POST` or `PATCH /admin/retail-price-rules`). A rule is a pricing
// decision, so nothing is saved before it has been previewed. Only what changed is sent on an edit.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog } from '@/components/ui';
import { useCreateRetailRule, usePreviewRetailRule, useUpdateRetailRule } from '../../hooks/useRetailPricing';
import {
  buildRuleBody,
  changedRuleFields,
  RULE_FIELD_ALIASES,
  RULE_FIELDS,
  ruleValues,
  type RuleValues,
} from '../../lib/retailRuleForm';
import type { RetailPriceRule, RetailRuleChange, RetailRulePreview } from '../../types';
import { RetailRuleFields } from './RetailRuleFields';
import { RetailRulePreviewView } from './RetailRulePreviewView';

export interface RetailRuleDialogProps {
  /** The rule to edit; leave out to make one. */
  rule?: RetailPriceRule;
  /** True for the shop's first rule: the form starts on the owner's example (IMEI services, 30%, ends in .99). */
  example?: boolean;
  onClose: () => void;
}

/** What the server said the change would do, with the change that asked. The same change is saved. */
type Previewed = { change: RetailRuleChange; result: RetailRulePreview };

/** Makes a rule or edits the one it is given. */
export function RetailRuleDialog({ rule, example = false, onClose }: RetailRuleDialogProps) {
  const preview = usePreviewRetailRule();
  const create = useCreateRetailRule();
  const update = useUpdateRetailRule();
  const [previewed, setPreviewed] = useState<Previewed | null>(null);
  const form = useForm<RuleValues>({ defaultValues: ruleValues(rule, example) });
  const scope = form.watch('scope');

  const previewStep = dialogSubmit(
    form,
    async (values) => {
      // What a rule covers never changes, so an edit takes it from the rule (the form's fixed fields are disabled).
      const target = rule ? ruleValues(rule) : values;
      const built = buildRuleBody({
        ...values,
        scope: target.scope,
        serviceType: target.serviceType,
        categoryId: target.categoryId,
      });
      if ('error' in built) {
        form.setError(built.field, { type: 'validate', message: built.error }, { shouldFocus: true });
        return false;
      }
      let change: RetailRuleChange = { kind: 'create', rule: built.body };
      if (rule) {
        const changed = changedRuleFields(built.body, rule);
        if (Object.keys(changed).length === 0) return 'Nothing changed.';
        change = { kind: 'update', id: rule.id, rule: changed };
      }
      setPreviewed({ change, result: await preview.mutateAsync(change) });
      // The dialog stays open on the preview.
      return false;
    },
    {
      // Every name here has an error line under its input; the target fields show only for the scope that uses them.
      fields: RULE_FIELDS.filter(
        (name) =>
          (name !== 'serviceType' || scope === 'type') && (name !== 'categoryId' || scope === 'category'),
      ),
      aliases: RULE_FIELD_ALIASES,
    },
  );

  // Saving has no fields of its own: a refusal (a rule that appeared meanwhile) shows in the dialog's error slot.
  const save = async () => {
    if (!previewed) return false;
    const { change } = previewed;
    if (change.kind === 'create') await create.mutateAsync(change.rule);
    else if (change.kind === 'update' && rule) await update.mutateAsync({ rule, body: change.rule });
  };

  return (
    <FormDialog
      open
      size="lg"
      title={rule ? 'Edit retail pricing rule' : 'New retail pricing rule'}
      sub={
        previewed
          ? 'Check what the rule does to the prices that follow it, then save it.'
          : 'Preview first: nothing is saved until you save the rule.'
      }
      confirm={previewed ? 'Save the rule' : 'Preview'}
      onClose={onClose}
      onSubmit={previewed ? save : previewStep}
    >
      {previewed ? (
        <RetailRulePreviewView preview={previewed.result} onBack={() => setPreviewed(null)} />
      ) : (
        <RetailRuleFields form={form} rule={rule} />
      )}
    </FormDialog>
  );
}
