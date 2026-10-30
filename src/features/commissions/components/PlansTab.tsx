// PlansTab: the "Plans" tab: the commission plans with their rate, what they are paid on, their conditions and how many agents use
// them, plus New plan, Edit and Delete. Ports `plansTab` of 46-p-commissions.js (which only had "Edit rate…"). A plan with agents
// cannot be deleted; the dialog shows the server's message.
import { useState } from 'react';
import { Badge, Button, DataTable, EmptyState, Icon, TypeTag, type DataTableColumn } from '@/components/ui';
import { pct } from '@/lib/format';
import { useAssignments } from '../hooks/useAssignments';
import type { CommissionGrants } from '../hooks/useCommissionGrants';
import { usePlans } from '../hooks/usePlans';
import { agentCounts } from '../lib/assignment';
import { conditionsText, kindLabel } from '../lib/plans';
import type { CommissionPlan } from '../types';
import { DeletePlanDialog } from './DeletePlanDialog';
import { PlanDialog } from './PlanDialog';

type Dialog = { kind: 'create' } | { kind: 'edit' | 'delete'; plan: CommissionPlan };

/** The plan list with its dialogs. */
export function PlansTab({ grants }: { grants: CommissionGrants }) {
  const { plans, query } = usePlans(grants.ready);
  const { assignments } = useAssignments(grants.ready);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const counts = agentCounts(assignments);
  const createLock = grants.needs('commissions:create');
  const updateLock = grants.needs('commissions:update');
  const deleteLock = grants.needs('commissions:delete');

  const newButton = (
    <Button
      variant="primary"
      size="sm"
      disabled={createLock.disabled}
      title={createLock.title}
      onClick={() => setDialog({ kind: 'create' })}
    >
      <Icon name="plus" className="ic-sm" />
      New plan
    </Button>
  );

  const columns: DataTableColumn<CommissionPlan>[] = [
    {
      key: 'name',
      label: 'Plan',
      render: (plan) => (
        <>
          <span className={plan.isActive ? 'font-medium' : 'font-medium text-ink3'}>{plan.name}</span>
          <p className="mt-0.5">
            <TypeTag>{kindLabel(plan.kind)}</TypeTag>
          </p>
        </>
      ),
    },
    { key: 'rate', label: 'Rate', num: true, render: (plan) => pct(plan.percent, 1) },
    { key: 'basis', label: 'Paid on', hide: 'md', render: (plan) => plan.basis },
    { key: 'period', label: 'Period', hide: 'lg', render: (plan) => plan.period },
    {
      key: 'conditions',
      label: 'Conditions',
      hide: 'lg',
      render: (plan) => (
        <span className="block max-w-[240px] truncate text-ink2" title={conditionsText(plan.tiers)}>
          {conditionsText(plan.tiers)}
        </span>
      ),
    },
    { key: 'agents', label: 'Agents', num: true, render: (plan) => counts.get(plan.id) ?? 0 },
    {
      key: 'status',
      label: 'Status',
      render: (plan) =>
        plan.isActive ? (
          <Badge tone="good" icon="checkCircle">
            Active
          </Badge>
        ) : (
          <Badge tone="neutral" icon="ban">
            Off
          </Badge>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (plan) => (
        <span className="flex justify-end gap-1.5">
          <Button
            size="sm"
            aria-label={`Edit ${plan.name} plan`}
            disabled={updateLock.disabled}
            title={updateLock.title}
            onClick={() => setDialog({ kind: 'edit', plan })}
          >
            Edit…
          </Button>
          <Button
            size="sm"
            variant="danger"
            aria-label={`Delete ${plan.name} plan`}
            disabled={deleteLock.disabled}
            title={deleteLock.title}
            onClick={() => setDialog({ kind: 'delete', plan })}
          >
            Delete
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <p className="min-w-[13rem] flex-1 text-sm text-ink2">
          A plan sets the rate an agent earns. Assign it to a merchant on the Agents tab.
        </p>
        {newButton}
      </div>
      <div className="border-t border-line">
        <DataTable
          caption="Commission plans"
          columns={columns}
          rows={plans}
          rowKey={(plan) => plan.id}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          errorTitle="Could not load the plans"
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState icon="percent" title="No plans" cta={newButton}>
              Create a plan to start paying referral commissions.
            </EmptyState>
          }
        />
      </div>
      <p className="border-t border-line p-3.5 text-xs text-ink3">
        A rate change applies to orders completed after you save it. Accruals already earned keep the rate
        they were earned at.
      </p>
      {dialog?.kind === 'create' && <PlanDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <PlanDialog plan={dialog.plan} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeletePlanDialog plan={dialog.plan} onClose={() => setDialog(null)} />}
    </>
  );
}
