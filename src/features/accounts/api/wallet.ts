// The wallet routes of an account: one address for both kinds, chosen by the rank: the live wallet, its statement, a
// manual adjustment, the credit limit, freeze and unfreeze, and the official statement file. The server posts every ledger entry and
// owns every balance and rule; the console only sends the request and shows the answer. Every write carries an `Idempotency-Key`
//, so a retry of one dialog opening can never post twice. The map gives no bodies (MISMATCHES M10): shapes are assumed.
import {
  apiDownload,
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type {
  AccountWallet,
  AdjustWalletBody,
  AdjustWalletResult,
  CreditLimitBody,
  StatementRow,
  WalletReasonBody,
} from '../types';
import { idempotencyHeaders, keyedWrite } from './headers';

/**
 * The live wallet of one account: balance, reserved for open orders, credit limit, what is available to spend, the hold with its
 * reason, unpaid top-ups, open top-up disputes and the adjustment approval limit. A guest has all zeros. Needs `wallet:read`.
 * @route GET /admin/clients/:id/wallet
 */
export function getAccountWallet(id: Id, init?: ApiInit): Promise<AccountWallet> {
  return apiGet<AccountWallet>(pathOf('/admin/clients/:id/wallet', { id }), undefined, init);
}

/**
 * The statement of the live wallet: one row per ledger entry, one page of them, with the total in `x-total-count`. Sort with
 * `_sort=createdAt&_order=desc` (newest first); filter with `createdAt_gte` and `createdAt_lte` (ISO times, passed in
 * `query.filters`). Needs `wallet:read`.
 * @route GET /admin/clients/:id/statement
 */
export function listAccountStatement(
  id: Id,
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<StatementRow>> {
  return apiList<StatementRow>(pathOf('/admin/clients/:id/statement', { id }), query, undefined, init);
}

/**
 * Adds to or takes from the wallet by hand, with a reason that goes to the ledger and the audit log. The server posts the balanced
 * entries and refuses what it must (a debit past the credit limit or below zero, an amount over the approval limit, no wallet) and
 * answers the first adjustment again when the same `idempotencyKey` and body arrive twice (another body is 409
 * `IDEMPOTENCY_KEY_REUSED`, worded for staff by `keyedWrite`). Needs `wallet:adjust`.
 * Assumed contract: body `{ amount, direction, reason }` with a positive 4-decimal `amount`, answer `{ transactionId, wallet }`.
 * @route POST /admin/clients/:id/wallet/adjust
 */
export function adjustAccountWallet(
  id: Id,
  body: AdjustWalletBody,
  idempotencyKey: string,
  init?: ApiInit,
): Promise<AdjustWalletResult> {
  return keyedWrite(
    apiPost<AdjustWalletResult>(
      pathOf('/admin/clients/:id/wallet/adjust', { id }),
      body,
      idempotencyHeaders(idempotencyKey, init),
    ),
  );
}

/**
 * Sets how far below zero a merchant wallet may go. Zero removes the credit. A store balance answers 422 (`creditLimit`,
 * `not_allowed`). The `Idempotency-Key` header is required. Needs `wallet:credit_limit`.
 * Assumed contract: body `{ creditLimit }`, answer the wallet afterwards.
 * @route PATCH /admin/clients/:id/credit-limit
 */
export function setAccountCreditLimit(
  id: Id,
  body: CreditLimitBody,
  idempotencyKey: string,
  init?: ApiInit,
): Promise<AccountWallet> {
  return keyedWrite(
    apiPatch<AccountWallet>(
      pathOf('/admin/clients/:id/credit-limit', { id }),
      body,
      idempotencyHeaders(idempotencyKey, init),
    ),
  );
}

/**
 * Puts the live wallet on hold: it cannot be spent (a merchant wallet refuses new holds; a store balance stops card top-ups);
 * credits, refunds and staff adjustments still work. Freezing a frozen wallet changes nothing. A customer is emailed, a merchant is not. The
 * `Idempotency-Key` header is required. Needs `wallet:adjust`.
 * Assumed contract: body `{ reason }` of 5 to 200 characters, answer the wallet.
 * @route POST /admin/clients/:id/wallet/freeze
 */
export function freezeAccountWallet(
  id: Id,
  body: WalletReasonBody,
  idempotencyKey: string,
  init?: ApiInit,
): Promise<AccountWallet> {
  return keyedWrite(
    apiPost<AccountWallet>(
      pathOf('/admin/clients/:id/wallet/freeze', { id }),
      body,
      idempotencyHeaders(idempotencyKey, init),
    ),
  );
}

/**
 * Lifts the hold. The server refuses while a store balance is below zero (`CONFLICT`) or a dispute of one of the account's top-ups is
 * open (`OPEN_DISPUTE`, either kind). The `Idempotency-Key` header is required. Needs `wallet:adjust`.
 * Assumed contract: body `{ reason }`, answer the wallet.
 * @route POST /admin/clients/:id/wallet/unfreeze
 */
export function unfreezeAccountWallet(
  id: Id,
  body: WalletReasonBody,
  idempotencyKey: string,
  init?: ApiInit,
): Promise<AccountWallet> {
  return keyedWrite(
    apiPost<AccountWallet>(
      pathOf('/admin/clients/:id/wallet/unfreeze', { id }),
      body,
      idempotencyHeaders(idempotencyKey, init),
    ),
  );
}

/**
 * Downloads the official account statement of an account with a merchant wallet (the file accountants keep). The name comes from the
 * server's `Content-Disposition`, else `statement-<id>.pdf`; the name used is returned. Needs `reports:read`.
 * Assumed contract: the answer is a file.
 * @route GET /admin/reports/client-statement/:clientId
 */
export function downloadAccountStatement(accountId: Id, init?: ApiInit): Promise<string> {
  return apiDownload(
    pathOf('/admin/reports/client-statement/:clientId', { clientId: accountId }),
    undefined,
    `statement-${accountId}.pdf`,
    init,
  );
}
