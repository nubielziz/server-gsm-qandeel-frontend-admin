// How many deposits wait for review: the count that Money in and Deposits carry in the Money page's links.
import { useFinanceGrants } from './useFinanceGrants';
import { usePendingDeposits } from './usePaymentCounts';

/**
 * The deposits waiting for review, from the server's total. It is undefined while the count loads, when it failed, and without
 * `payments:read` (the call is not made at all). It shares its query key with the Deposits view's Pending count, so approving or
 * rejecting a deposit refreshes the link as well.
 *
 * Why: the Money page shows "Money in (3)" and "Deposits (3)" so a person sees from any view that a decision is waiting.
 * @returns the number of pending deposits, or undefined when it is not known.
 */
export function useDepositsWaiting(): number | undefined {
  const grants = useFinanceGrants();
  return usePendingDeposits(grants.ready && grants.can('payments:read')).data;
}
