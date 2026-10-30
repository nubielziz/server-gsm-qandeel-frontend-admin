// RulesSection: "Pricing rules" of the Rules and groups tab: the rules table with New rule, and the create, edit and delete dialogs.
// Ports the "Category rules" block of rulesTab and its `cat-on` / `cat-off` actions in 43-p-services.js, as a full list of rules.
import { useState } from 'react';
import { Button, EmptyState, Icon } from '@/components/ui';
import { usePricingRules, useToggleRule } from '../hooks/usePricingRules';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import type { PricingRule } from '../types';
import { DeleteRuleDialog } from './DeleteRuleDialog';
import { RuleDialog } from './RuleDialog';
import { RuleSection } from './RuleSection';
import { RulesTable } from './RulesTable';

type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; rule: PricingRule };

/** The rules table with its dialogs. */
export function RulesSection({ grants }: { grants: ServiceGrants }) {
  const { rules, query } = usePricingRules(grants.ready);
  const toggle = useToggleRule();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('pricing:create');

  const newButton = (
    <Button
      size="sm"
      variant="primary"
      disabled={createLock.disabled}
      title={createLock.title}
      onClick={() => setDialog({ kind: 'create' })}
    >
      <Icon name="plus" className="ic-sm" />
      New rule
    </Button>
  );

  return (
    <>
      <RuleSection
        title="Pricing rules"
        sub="Margin and discount rules and promos. Applied before the group discount. Changes affect new orders only."
        right={newButton}
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
      {dialog?.kind === 'create' && <RuleDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <RuleDialog rule={dialog.rule} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteRuleDialog rule={dialog.rule} onClose={() => setDialog(null)} />}
    </>
  );
}
