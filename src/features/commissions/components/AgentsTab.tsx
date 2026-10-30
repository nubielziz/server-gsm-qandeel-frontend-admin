// AgentsTab: the "Agents" tab: the merchants on a commission plan, built from the commission assignments. Ports `agentsTab` of
// 46-p-commissions.js (agent, plan) and adds what the map gives: since when, Assign plan, Change plan and End. The demo's referred
// count and revenue figures are not in the assignment row (MISMATCHES, MISMATCHES M155); "Ready to approve" links to the accruals.
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, DataTable, EmptyState, Icon, type DataTableColumn } from '@/components/ui';
import { merchantPath } from '@/features/merchants';
import { fmtDate, fmtDay, pct } from '@/lib/format';
import { useAssignments } from '../hooks/useAssignments';
import type { CommissionGrants } from '../hooks/useCommissionGrants';
import { agentLabel, planLabel } from '../lib/assignment';
import { commissionsPath } from '../lib/filters';
import type { CommissionAssignment } from '../types';
import { AssignDialog } from './AssignDialog';
import { ChangePlanDialog } from './ChangePlanDialog';
import { EndAssignmentDialog } from './EndAssignmentDialog';

type Dialog = { kind: 'assign' } | { kind: 'plan' | 'end'; assignment: CommissionAssignment };

/** The agents list with its three dialogs. */
export function AgentsTab({ grants }: { grants: CommissionGrants }) {
  const { assignments, query } = useAssignments(grants.ready);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const assignLock = grants.needsAll('commissions:create', 'clients:read');
  const updateLock = grants.needs('commissions:update');
  const endLock = grants.needs('commissions:delete');

  const assignButton = (
    <Button
      variant="primary"
      size="sm"
      disabled={assignLock.disabled}
      title={assignLock.title}
      onClick={() => setDialog({ kind: 'assign' })}
    >
      <Icon name="plus" className="ic-sm" />
      Assign plan
    </Button>
  );

  const columns: DataTableColumn<CommissionAssignment>[] = [
    {
      key: 'agent',
      label: 'Agent',
      render: (assignment) => (
        <>
          <Link className="link font-medium" to={merchantPath(assignment.beneficiaryId)}>
            {agentLabel(assignment)}
          </Link>
          {assignment.beneficiary?.country && (
            <p className="text-xs text-ink3">{assignment.beneficiary.country}</p>
          )}
        </>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (assignment) => (
        <>
          {planLabel(assignment)}{' '}
          {assignment.plan && <span className="text-ink3">{pct(assignment.plan.percent, 1)}</span>}
        </>
      ),
    },
    {
      key: 'since',
      label: 'Since',
      hide: 'sm',
      render: (assignment) => {
        const since = assignment.startsAt ?? assignment.createdAt;
        return (
          <>
            <span title={fmtDate(since)}>{fmtDay(since)}</span>
            {assignment.endsAt && <p className="text-xs text-ink3">Until {fmtDay(assignment.endsAt)}</p>}
          </>
        );
      },
    },
    {
      key: 'scope',
      label: 'Scope',
      hide: 'lg',
      render: (assignment) => assignment.scope || '–',
    },
    {
      key: 'accruals',
      label: 'Accruals',
      hide: 'md',
      render: (assignment) => (
        <Link
          className="link"
          to={commissionsPath({ agent: assignment.beneficiaryId })}
          aria-label={`Ready to approve for ${agentLabel(assignment)}`}
        >
          Ready to approve
        </Link>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (assignment) => (
        <span className="flex justify-end gap-1.5">
          <Button
            size="sm"
            aria-label={`Change plan of ${agentLabel(assignment)}`}
            disabled={updateLock.disabled}
            title={updateLock.title}
            onClick={() => setDialog({ kind: 'plan', assignment })}
          >
            Change plan…
          </Button>
          <Button
            size="sm"
            variant="danger"
            aria-label={`End plan of ${agentLabel(assignment)}`}
            disabled={endLock.disabled}
            title={endLock.title}
            onClick={() => setDialog({ kind: 'end', assignment })}
          >
            End…
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <p className="min-w-[13rem] flex-1 text-sm text-ink2">
          Agents are merchants on a commission plan. They earn on the orders of the merchants they referred.
        </p>
        {assignButton}
      </div>
      <div className="border-t border-line">
        <DataTable
          caption="Agents"
          columns={columns}
          rows={assignments}
          rowKey={(assignment) => assignment.id}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          errorTitle="Could not load the agents"
          onRetry={() => void query.refetch()}
          empty={
            <EmptyState icon="users" title="No agents yet" cta={assignButton}>
              Put a merchant on a commission plan and set “referred by” on the merchants they bring in.
            </EmptyState>
          }
        />
      </div>
      {dialog?.kind === 'assign' && <AssignDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'plan' && (
        <ChangePlanDialog assignment={dialog.assignment} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'end' && (
        <EndAssignmentDialog assignment={dialog.assignment} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
