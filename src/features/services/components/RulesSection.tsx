// RulesSection: "Pricing rules" of the Merchant price rules view: the rules table, and the create, edit and delete dialogs. New rule is the view's
// primary button, so it sits in the pinned bar of RulesTab, which tells this block to open the create dialog (`creating`).
// Ports the "Category rules" block of rulesTab and its `cat-on` / `cat-off` actions in 43-p-services.js, as a full list of rules.
import { useState } from 'react';
import { EmptyState } from '@/components/ui';
import { usePricingRules, useToggleRule } from '../hooks/usePricingRules';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import type { PricingRule } from '../types';
import { DeleteRuleDialog } from './DeleteRuleDialog';
import { RuleDialog } from './RuleDialog';
import { RuleSection } from './RuleSection';
import { RulesTable } from './RulesTable';

type Dialog = { kind: 'edit' | 'delete'; rule: PricingRule };

export interface RulesSectionProps {
  grants: ServiceGrants;
  /** The New rule button of the pinned bar was pressed: the create dialog is open until `onCloseCreate`. */
  creating: boolean;
  onCloseCreate: () => void;
}

/** The rules table with its dialogs. */
export function RulesSection({ grants, creating, onCloseCreate }: RulesSectionProps) {
  const { rules, query } = usePricingRules(grants.ready);
  const toggle = useToggleRule();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  return (
    <>
      <RuleSection
        title="Pricing rules"
        sub="Margin and discount rules and promos. Applied before the group discount. Changes affect new orders only."
      >
        <RulesTable
          rules={rules}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          onRetry={() => void query.refetch()}
          grants={grants}
          busyId={toggle.isPending ? toggle.variables?.rule.id : undefined}
          empty={
            <EmptyState icon="percent" title="No pricing rules">
              No rules, so prices use the base price and the group discount. Add a rule to adjust a category
              or a service, or to run a promo.
            </EmptyState>
          }
          onEdit={(rule) => setDialog({ kind: 'edit', rule })}
          onToggle={(rule) => toggle.mutate({ rule, isActive: !rule.isActive })}
          onDelete={(rule) => setDialog({ kind: 'delete', rule })}
        />
      </RuleSection>
      {creating && <RuleDialog onClose={onCloseCreate} />}
      {dialog?.kind === 'edit' && <RuleDialog rule={dialog.rule} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteRuleDialog rule={dialog.rule} onClose={() => setDialog(null)} />}
    </>
  );
}
