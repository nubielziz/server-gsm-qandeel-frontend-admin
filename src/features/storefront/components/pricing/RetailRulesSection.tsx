// RetailRulesSection: the "Retail pricing rules" block: the rules table with New rule, and the dialogs to make, edit, turn off or on
// and delete a rule. A rule is a pricing decision, so every change is previewed by the server first. The rules need pricing:read.
import { useState } from 'react';
import { Button, EmptyState, Icon } from '@/components/ui';
import { useRetailRules } from '../../hooks/useRetailPricing';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { RetailPriceRule } from '../../types';
import { PricingSection } from './PricingSection';
import { RetailRuleChangeDialog } from './RetailRuleChangeDialog';
import { RetailRuleDialog } from './RetailRuleDialog';
import { RetailRulesTable } from './RetailRulesTable';

type Dialog = { kind: 'create' } | { kind: 'edit' | 'toggle' | 'delete'; rule: RetailPriceRule };

/** The table, its New rule button and the dialog that is open. */
export function RetailRulesSection({ grants }: { grants: StorefrontGrants }) {
  const rules = useRetailRules(grants.ready && grants.can('pricing:read'));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('pricing:create');
  const close = () => setDialog(null);
  const newRule = () => setDialog({ kind: 'create' });
  // The owner's first rule: with none yet, the form starts on "IMEI, 30%, ends in .99".
  const first = rules.query.isSuccess && rules.total === 0;

  const newButton = (
    <Button
      size="sm"
      variant="primary"
      disabled={createLock.disabled}
      title={createLock.title}
      onClick={newRule}
    >
      <Icon name="plus" className="ic-sm" />
      New rule
    </Button>
  );

  return (
    <>
      <PricingSection
        title="Retail pricing rules"
        sub="The shop's price follows the supplier's cost: the cost, plus a margin, rounded up, never under the floor. The most specific rule wins: a category, then a service type, then every service."
        right={newButton}
      >
        <RetailRulesTable
          rules={rules.rows}
          state={rules.query.isLoading ? 'loading' : rules.query.isError ? 'error' : 'ready'}
          error={rules.query.error}
          onRetry={() => void rules.query.refetch()}
          grants={grants}
          empty={
            <EmptyState icon="percent" title="No retail pricing rule yet" cta={newButton}>
              A rule prices the shop from each service&apos;s cost.
            </EmptyState>
          }
          onEdit={(rule) => setDialog({ kind: 'edit', rule })}
          onToggle={(rule) => setDialog({ kind: 'toggle', rule })}
          onDelete={(rule) => setDialog({ kind: 'delete', rule })}
        />
      </PricingSection>
      {dialog?.kind === 'create' && <RetailRuleDialog example={first} onClose={close} />}
      {dialog?.kind === 'edit' && <RetailRuleDialog rule={dialog.rule} onClose={close} />}
      {(dialog?.kind === 'toggle' || dialog?.kind === 'delete') && (
        <RetailRuleChangeDialog rule={dialog.rule} action={dialog.kind} onClose={close} />
      )}
    </>
  );
}
