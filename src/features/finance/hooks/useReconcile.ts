// "Run reconciliation": asks the server to compare every account with its entries and returns what it found. It replaces the
// demo's integrity checks, which the browser worked out itself. The result is shown by the page in a dialog.
import { useApiMutation } from '@/lib/query';
import { reconcileLedger } from '../api';
import { TRIAL_BALANCE_KEY } from './keys';

/**
 * The server's answer is the result, so there is no success toast; a failed run toasts the server's message. The trial
 * balance is read again after a run, since a reconciliation may correct what it finds.
 */
export function useReconcile() {
  return useApiMutation({
    mutationFn: () => reconcileLedger(),
    invalidateKeys: [TRIAL_BALANCE_KEY],
  });
}
