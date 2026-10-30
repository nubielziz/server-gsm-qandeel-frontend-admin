// AccrualsTab: the "Accruals" tab: the status buttons and agent filter, the approval strip, the table with tick boxes, and the
// approval dialogs. Ports `accrualsTab` and the `ca-*` actions of 46-p-commissions.js. Status, agent, page and sort live in the
// address; the server filters, sorts, counts and pays, and the amounts shown here are added up for display only.
import { useState } from 'react';
import { toast, usePageClamp } from '@/components/ui';
import { useOrderDrawer } from '@/features/orders';
import { money, num } from '@/lib/format';
import type { AccrualCounts } from '../hooks/useAccrualCounts';
import { useReadAccruals } from '../hooks/useAccrualMutations';
import { useAccrualSelection } from '../hooks/useAccrualSelection';
import { useAccrualView } from '../hooks/useAccrualView';
import { useAccrualsList } from '../hooks/useAccrualsList';
import { useAssignments } from '../hooks/useAssignments';
import type { CommissionGrants } from '../hooks/useCommissionGrants';
import { commissionsText } from '../lib/accrual';
import { agentOptions } from '../lib/assignment';
import { PAGE_SIZE, toListFilters, type AccrualView } from '../lib/filters';
import type { CommissionAccrual } from '../types';
import { AccrualsEmpty } from './AccrualsEmpty';
import { AccrualsTable } from './AccrualsTable';
import { AccrualsToolbar } from './AccrualsToolbar';
import { ApproveBar } from './ApproveBar';
import { ApproveDialog, type ApproveOutcome } from './ApproveDialog';
import { ApproveResultDialog } from './ApproveResultDialog';

export interface AccrualsTabProps {
  grants: CommissionGrants;
  /** The status counts, which the page also shows on its tab and header. */
  counts: AccrualCounts;
}

/** The accruals list with the bulk approval. */
export function AccrualsTab({ grants, counts }: AccrualsTabProps) {
  const { view, page, sort, setView, setPage, setSort } = useAccrualView();
  const list = useAccrualsList({
    filters: toListFilters(view),
    page,
    pageSize: PAGE_SIZE,
    sort,
    enabled: grants.ready,
  });
  // A shrinking list (an approval, a filter, an old link) must not leave the table on an empty page.
  usePageClamp({
    page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });
  const agents = useAssignments(grants.ready);
  const picks = useAccrualSelection(list.accruals);
  const readAll = useReadAccruals();
  const drawer = useOrderDrawer();
  // The rows being approved are kept while the dialog is open, so clearing the ticks after the call does not empty it.
  const [approving, setApproving] = useState<CommissionAccrual[] | null>(null);
  const [outcome, setOutcome] = useState<ApproveOutcome | null>(null);
  const approveLock = grants.needs('commissions:approve');

  // Ticks are cleared when the list changes under them (a status, an agent, the sort, the page), so nothing is approved out of sight.
  const changeView = (patch: Partial<AccrualView>) => {
    picks.reset();
    setView(patch);
  };

  const selectAll = () =>
    readAll.mutate(toListFilters(view), {
      onSuccess: ({ rows, total }) => {
        picks.adopt(rows);
        if (total > rows.length) {
          toast({ kind: 'info', title: `Selected the first ${num(rows.length)} of ${num(total)} accruals` });
        }
      },
    });

  // A clean approval is a toast, as in the demo; one that skipped accruals opens a summary with the server's reasons.
  const finish = (done: ApproveOutcome) => {
    picks.reset();
    const { result, rows } = done;
    if (result.skipped.length > 0) {
      setOutcome(done);
      return;
    }
    const wallets = new Set(rows.map((row) => row.beneficiaryId)).size;
    toast({
      kind: 'success',
      title: `${commissionsText(result.approved)} approved`,
      body: `${money(result.total)} credited to ${wallets} ${wallets === 1 ? 'agent wallet' : 'agent wallets'}.`,
    });
  };

  return (
    <>
      <AccrualsToolbar
        view={view}
        counts={counts}
        agents={agentOptions(agents.assignments, view.agent)}
        onChange={changeView}
        total={list.total}
        selectAll={{
          disabled: approveLock.disabled,
          title: approveLock.title,
          busy: readAll.isPending,
          onSelect: selectAll,
        }}
      />
      <ApproveBar
        count={picks.selection.selected.size}
        rows={picks.rows}
        lock={approveLock}
        onClear={picks.reset}
        onApprove={() => setApproving(picks.rows)}
      />
      <div className="border-t border-line">
        <AccrualsTable
          rows={list.accruals}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          sort={sort}
          onSortChange={(next) => {
            picks.reset();
            setSort(next);
          }}
          pagination={{ page, pageSize: PAGE_SIZE, total: list.total ?? list.accruals.length }}
          onPageChange={(next) => {
            picks.reset();
            setPage(next);
          }}
          selection={view.status === 'accrued' ? picks.selection : undefined}
          empty={
            <AccrualsEmpty
              status={view.status}
              anyAccruals={(counts.all ?? 0) > 0}
              onSeeApproved={() => changeView({ status: 'approved' })}
            />
          }
          onOrder={grants.can('orders:read') ? drawer.open : undefined}
        />
      </div>
      {approving && approving.length > 0 && (
        <ApproveDialog rows={approving} onClose={() => setApproving(null)} onDone={finish} />
      )}
      {outcome && <ApproveResultDialog outcome={outcome} onClose={() => setOutcome(null)} />}
    </>
  );
}
