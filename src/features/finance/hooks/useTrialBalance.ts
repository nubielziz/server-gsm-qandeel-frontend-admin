// The trial balance: every account kind with its balance, read from the server. Ports the data side of accountsTab
// (45-p-finance.js), which added the balances up in the browser. The tab and the header's Bank and Supplier prepaid share it.
import { getTrialBalance } from '../api';
import { useApiQuery } from '@/lib/query';
import { REFRESH_MS, TRIAL_BALANCE_KEY } from './keys';

/** Pass `enabled: false` while permissions load or without `ledger:read`. */
export function useTrialBalance(enabled = true) {
  return useApiQuery({
    queryKey: TRIAL_BALANCE_KEY,
    queryFn: ({ signal }) => getTrialBalance({ signal }),
    enabled,
    refetchInterval: REFRESH_MS,
  });
}
