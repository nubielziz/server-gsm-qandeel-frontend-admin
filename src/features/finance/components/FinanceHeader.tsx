// FinanceHeader: the page title, the line about what waits for a decision, and the page's action. Ports the `pageHead` of
// pageFinance in 45-p-finance.js. The demo's "Export ledger CSV" button is not here (MISMATCHES M125); Run reconciliation is new.
import { Button, Icon, PageHeader } from '@/components/ui';
import type { FinanceGrants } from '../hooks/useFinanceGrants';

export interface FinanceHeaderProps {
  grants: FinanceGrants;
  /** Deposits waiting for review, from the server; undefined while unknown or without `payments:read`. */
  pending: number | undefined;
  /** A reconciliation is running. */
  reconciling: boolean;
  onReconcile: () => void;
}

export function FinanceHeader({ grants, pending, reconciling, onReconcile }: FinanceHeaderProps) {
  const lock = grants.needs('ledger:reconcile');
  const books = 'Every balance below comes from posted ledger entries.';
  const sub = pending ? (
    <>
      <span className="font-medium text-warn-fg">
        {pending} {pending === 1 ? 'deposit needs' : 'deposits need'} a decision.
      </span>{' '}
      Deposits change real balances, so each one is reviewed.
    </>
  ) : pending === 0 ? (
    `Nothing is waiting. ${books}`
  ) : (
    books
  );
  return (
    <PageHeader
      title="Finance"
      sub={sub}
      actions={
        <Button disabled={lock.disabled} title={lock.title} loading={reconciling} onClick={onReconcile}>
          <Icon name="refresh" className="ic-sm" />
          Run reconciliation
        </Button>
      }
    />
  );
}
