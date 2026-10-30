// IntegrityChecks: the panel beside the trial balance: do debits equal credits, and what reconciliation checks. Ports the
// "Integrity checks" list of accountsTab in 45-p-finance.js. The demo worked out three checks in the browser; the first stays
// (a comparison of the server's two totals) and the other two are the server's reconciliation, run from the page header.
import { Icon } from '@/components/ui';
import { money } from '@/lib/format';
import { booksBalance } from '../lib/accounts';
import type { TrialBalance } from '../types';

export function IntegrityChecks({ trial }: { trial: Pick<TrialBalance, 'totalDebit' | 'totalCredit'> }) {
  const balanced = booksBalance(trial);
  return (
    <div className="p-3.5">
      <h3 className="panel-t">Integrity checks</h3>
      <ul className="m-0 mt-2 list-none space-y-2.5 p-0">
        <li className="flex items-start gap-2.5">
          <span className={`mt-px ${balanced ? 'text-good-fg' : 'text-crit-fg'}`}>
            <Icon name={balanced ? 'checkCircle' : 'xCircle'} className="ic-sm" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Debits equal credits</p>
            <p className="text-xs text-ink3">
              {balanced
                ? `Passes. ${money(trial.totalDebit)} on both sides`
                : `Does not match. ${money(trial.totalDebit)} of debits against ${money(trial.totalCredit)} of credits`}
            </p>
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-px text-ink3">
            <Icon name="info" className="ic-sm" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Accounts match their entries</p>
            <p className="text-xs text-ink3">
              Run reconciliation (top right) compares every account with the entries behind it and lists any
              difference.
            </p>
          </div>
        </li>
      </ul>
      <p className="mt-4 text-xs text-ink3">
        Every balance is backed by posted journal entries. Entries opens the ones behind an account.
      </p>
    </div>
  );
}
