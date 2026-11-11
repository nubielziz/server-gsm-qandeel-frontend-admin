// A customer's store balance routes: the figures, the statement, a manual adjustment, and freeze and unfreeze. Feature 21 adds
// these routes beyond the map. The server posts every ledger entry and owns every balance and every rule (limits, approval,
// holds); the console only sends the request and shows the answer. Each write needs an `Idempotency-Key`, so a retry of one
// dialog opening can never post twice.
import {
  apiGet,
  apiList,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type {
  AdjustWalletBody,
  AdjustWalletResult,
  CustomerWallet,
  FreezeWalletBody,
  WalletStatementRow,
} from '../types';

// The header every wallet write carries, merged with the caller's own headers.
function withKey(idempotencyKey: string, init?: ApiInit): ApiInit {
  return { ...init, headers: { ...init?.headers, 'Idempotency-Key': idempotencyKey } };
}

/**
 * The store balance of one customer: balance, what can be spent, the hold with its reason, unpaid top-ups, open top-up
 * disputes and the adjust approval limit. All zero while the customer has no wallet. Needs `wallet:read`.
 * @route GET /admin/customers/:id/wallet
 */
export function getCustomerWallet(id: Id, init?: ApiInit): Promise<CustomerWallet> {
  return apiGet<CustomerWallet>(pathOf('/admin/customers/:id/wallet', { id }), undefined, init);
}

/**
 * The customer's statement: one row per ledger entry on the balance, one page of them, with the total in `x-total-count`.
 * Sort with `_sort=createdAt&_order=desc` (newest first); filter with `createdAt_gte` and `createdAt_lte` (ISO times,
 * passed in `query.filters`). Needs `wallet:read`.
 * @route GET /admin/customers/:id/wallet/statement
 */
export function listCustomerWalletStatement(
  id: Id,
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<WalletStatementRow>> {
  return apiList<WalletStatementRow>(
    pathOf('/admin/customers/:id/wallet/statement', { id }),
    query,
    undefined,
    init,
  );
}

/**
 * Adds to or takes from the balance by hand, with a reason that goes to the ledger, the audit log and the customer's email.
 * The server refuses what it must (a debit below zero, an amount over the approval limit, a customer with no account) and
 * answers the first adjustment again when the same `idempotencyKey` and body arrive twice. Needs `wallet:adjust`.
 * @route POST /admin/customers/:id/wallet/adjust
 */
export function adjustCustomerWallet(
  id: Id,
  body: AdjustWalletBody,
  idempotencyKey: string,
  init?: ApiInit,
): Promise<AdjustWalletResult> {
  return apiPost<AdjustWalletResult>(
    pathOf('/admin/customers/:id/wallet/adjust', { id }),
    body,
    withKey(idempotencyKey, init),
  );
}

/**
 * Puts the balance on hold: it cannot be spent and card top-ups stop; bank top-ups, credits, refunds and staff adjustments
 * still work. Freezing a frozen balance changes nothing. The customer is emailed. Needs `wallet:adjust`.
 * @route POST /admin/customers/:id/wallet/freeze
 */
export function freezeCustomerWallet(
  id: Id,
  body: FreezeWalletBody,
  idempotencyKey: string,
  init?: ApiInit,
): Promise<CustomerWallet> {
  return apiPost<CustomerWallet>(
    pathOf('/admin/customers/:id/wallet/freeze', { id }),
    body,
    withKey(idempotencyKey, init),
  );
}

/**
 * Lifts the hold. The server refuses while the balance is below zero (`CONFLICT`) or a dispute of one of the customer's
 * top-ups is open (`OPEN_DISPUTE`). Needs `wallet:adjust`.
 * @route POST /admin/customers/:id/wallet/unfreeze
 */
export function unfreezeCustomerWallet(
  id: Id,
  body: FreezeWalletBody,
  idempotencyKey: string,
  init?: ApiInit,
): Promise<CustomerWallet> {
  return apiPost<CustomerWallet>(
    pathOf('/admin/customers/:id/wallet/unfreeze', { id }),
    body,
    withKey(idempotencyKey, init),
  );
}
