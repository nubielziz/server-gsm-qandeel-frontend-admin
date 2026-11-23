// RetailRulesSection: the "Retail pricing rules" section: the rules table, and the dialogs to make, edit, turn off or on and delete a rule.
// A rule is a pricing decision, so every change is previewed by the server first. New rule is the view's primary button, so it sits in the
// pinned bar of RetailPricingTab, which tells this section to open the create dialog (`creating`). The rules need pricing:read.
import { useState } from 'react';
import { EmptyState } from '@/components/ui';
import { useRetailRules } from '../../hooks/useRetailPricing';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { RetailPriceRule } from '../../types';
import { PricingSection } from './PricingSection';
import { RetailRuleChangeDialog } from './RetailRuleChangeDialog';
import { RetailRuleDialog } from './RetailRuleDialog';
import { RetailRulesTable } from './RetailRulesTable';

type Dialog = { kind: 'edit' | 'toggle' | 'delete'; rule: RetailPriceRule };

export interface RetailRulesSectionProps {
  grants: StorefrontGrants;
  /** The New rule button of the pinned bar was pressed: the create dialog is open until `onCloseCreate`. */
  creating: boolean;
  onCloseCreate: () => void;
}

/** The table and the dialog that is open. */
export function RetailRulesSection({ grants, creating, onCloseCreate }: RetailRulesSectionProps) {
  const rules = useRetailRules(grants.ready && grants.can('pricing:read'));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  // The owner's first rule: with none yet, the form starts on "IMEI, 30%, ends in .99".
  const first = rules.query.isSuccess && rules.total === 0;

  return (
    <>
      <PricingSection
        title="Retail pricing rules"
        sub="The shop's price follows the supplier's cost: the cost, plus a margin, rounded up, never under the floor. The most specific rule wins: a category, then a service type, then every service."
      >
        <RetailRulesTable
          rules={rules.rows}
          state={rules.query.isLoading ? 'loading' : rules.query.isError ? 'error' : 'ready'}
          error={rules.query.error}
          onRetry={() => void rules.query.refetch()}
          grants={grants}
          empty={
            <EmptyState icon="percent" title="No retail pricing rule yet">
              A rule prices the shop from each service&apos;s cost.
            </EmptyState>
          }
          onEdit={(rule) => setDialog({ kind: 'edit', rule })}
          onToggle={(rule) => setDialog({ kind: 'toggle', rule })}
          onDelete={(rule) => setDialog({ kind: 'delete', rule })}
        />
      </PricingSection>
      {creating && <RetailRuleDialog example={first} onClose={onCloseCreate} />}
      {dialog?.kind === 'edit' && <RetailRuleDialog rule={dialog.rule} onClose={close} />}
      {(dialog?.kind === 'toggle' || dialog?.kind === 'delete') && (
        <RetailRuleChangeDialog rule={dialog.rule} action={dialog.kind} onClose={close} />
      )}
    </>
  );
}
