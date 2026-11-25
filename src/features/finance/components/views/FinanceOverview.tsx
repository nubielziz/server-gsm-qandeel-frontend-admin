// FinanceOverview: the finance half of the Money page's Overview: the line about deposits waiting, "Run reconciliation" and the five key
// figures. Ports the page header and the strip of pageFinance in 45-p-finance.js; the page's title is the Money page's. The refund figures
// and the "Waiting for you" list belong to the page and to the refunds feature.
import { useState, type ReactNode } from 'react';
import { Button, Icon } from '@/components/ui';
import { useFinanceGrants } from '../../hooks/useFinanceGrants';
import { useFinanceStrip } from '../../hooks/useFinanceStrip';
import { useReconcile } from '../../hooks/useReconcile';
import type { ReconcileResult } from '../../types';
import { FinanceStrip } from '../FinanceStrip';
import { ReconcileDialog } from '../ReconcileDialog';

const BOOKS = 'Every balance below comes from posted ledger entries.';

/**
 * The sentence beside the button, or null when there is nothing to say. `pending` is the deposits waiting (undefined while unknown, or
 * when the role may not read deposits); `showBooks` is true when a balance is on screen, which is what the books sentence is about.
 */
function depositsLine(pending: number | undefined, showBooks: boolean): ReactNode {
  if (pending) {
    return (
      <>
        <span className="font-medium text-warn-fg">
          {pending} {pending === 1 ? 'deposit needs' : 'deposits need'} a decision.
        </span>{' '}
        Deposits change real balances, so each one is reviewed.
      </>
    );
  }
  const text = [pending === 0 ? 'Nothing is waiting.' : '', showBooks ? BOOKS : ''].filter(Boolean).join(' ');
  return text || null;
}

/**
 * The figures come from the server (the trial balance, the wallet exposure report and the pending-deposit count); one a role may not
 * read is left out, and a role that may read none of them sees nothing here (the refund figures and the Waiting panel still show).
 * The deposits sentence needs `payments:read`, the books sentence a balance on screen. "Run reconciliation" is shown to a role with
 * `ledger:read`; it needs `ledger:reconcile`: without it the button is disabled and says why. The server's answer opens in a
 * dialog; a failed run toasts the server's message.
 *
 * Side effects: `POST /admin/ledger/reconcile` on the button; the trial balance is read again afterwards.
 */
export function FinanceOverview() {
  const grants = useFinanceGrants();
  const strip = useFinanceStrip(grants);
  const reconcile = useReconcile();
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const lock = grants.needs('ledger:reconcile');

  const { canLedger, canReports, canPayments } = strip;
  if (!canLedger && !canReports && !canPayments) return null;
  const line = depositsLine(canPayments ? strip.pending.data : undefined, canLedger || canReports);

  return (
    <>
      {(line || canLedger) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="min-w-0 text-sm text-ink3">{line}</p>
          {canLedger && (
            <Button
              disabled={lock.disabled}
              title={lock.title}
              loading={reconcile.isPending}
              onClick={() => reconcile.mutate(undefined, { onSuccess: setResult })}
            >
              <Icon name="refresh" className="ic-sm" />
              Run reconciliation
            </Button>
          )}
        </div>
      )}
      <FinanceStrip strip={strip} />
      {result && <ReconcileDialog result={result} onClose={() => setResult(null)} />}
    </>
  );
}
