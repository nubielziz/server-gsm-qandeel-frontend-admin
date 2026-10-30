// TrialBalanceTab: the accounts tab of the Finance page: the trial balance beside the integrity checks. Ports accountsTab of
// 45-p-finance.js. The server sends the balances and the totals; the tab only splits each balance into debit or credit.
import { QueryState, SkeletonTable } from '@/components/ui';
import { useNavigate } from 'react-router';
import { useTrialBalance } from '../hooks/useTrialBalance';
import { toTrialLines } from '../lib/accounts';
import { financePath } from '../lib/tabs';
import { IntegrityChecks } from './IntegrityChecks';
import { TrialBalanceTable } from './TrialBalanceTable';

export function TrialBalanceTab() {
  const trial = useTrialBalance();
  const navigate = useNavigate();
  const data = trial.data;
  return (
    <div className="border-t border-line">
      <QueryState
        isLoading={trial.isLoading}
        isError={trial.isError}
        error={trial.error}
        onRetry={() => void trial.refetch()}
        errorTitle="Could not load the trial balance"
        skeleton={<SkeletonTable cols={4} rows={10} />}
        isEmpty={!data || data.rows.length === 0}
      >
        {data && (
          <div className="grid xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="border-b border-line xl:border-b-0 xl:border-e">
              <TrialBalanceTable
                lines={toTrialLines(data.rows)}
                totalDebit={data.totalDebit}
                totalCredit={data.totalCredit}
                onEntries={(kind) => void navigate(financePath('ledger', { account: kind }))}
              />
            </div>
            <IntegrityChecks trial={data} />
          </div>
        )}
      </QueryState>
    </div>
  );
}
