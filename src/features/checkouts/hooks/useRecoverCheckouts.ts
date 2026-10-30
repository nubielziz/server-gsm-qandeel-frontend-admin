// Sends the recovery email to some checkouts. Ports `ck-remind` / sendRecovery of the demo; the server decides who is emailed
// (consent, once only) and answers how many went out and which were left out, so a partly done send is shown, not hidden.
import { useApiMutation } from '@/lib/query';
import { recoverCheckouts } from '../api';
import { sentTitle } from '../lib/recovery';
import type { RecoverCheckoutsResult } from '../types';
import { CHECKOUTS_KEY } from './keys';

/**
 * `mutate(ids)` sends the email to those checkouts. A send that reached anyone shows the demo's toast; a send that reached nobody
 * shows none (the page's summary dialog says why). A failed call shows the server's error as a toast. `onDone` gets the answer.
 */
export function useRecoverCheckouts(onDone?: (result: RecoverCheckoutsResult) => void) {
  return useApiMutation({
    mutationFn: (ids: number[]) => recoverCheckouts({ ids }),
    invalidateKeys: [CHECKOUTS_KEY],
    successNotification: ({ sent }) =>
      sent > 0
        ? {
            message: sentTitle(sent),
            description: 'Each email has a one-click link back to the saved basket.',
          }
        : false,
    onSuccess: (result) => onDone?.(result),
  });
}
