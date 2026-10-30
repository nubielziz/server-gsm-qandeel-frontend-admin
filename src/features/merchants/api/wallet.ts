// A merchant's wallet routes: balances, statement, manual adjustment, credit limit and the official statement file. Ports
// merWalletTab and the `m-adjust` action of 42-p-merchants.js. The server posts every ledger entry and owns every balance;
// the console only sends the request and shows the answer. The map gives no bodies (MISMATCHES M10), so shapes are assumed.
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
  AdjustWalletBody,
  AdjustWalletResult,
  ClientWallet,
  CreditLimitBody,
  StatementRow,
} from '../types';

/**
 * The wallet figures of one merchant: balance, reserved for open orders, credit limit and what is available to spend.
 * Needs `wallet:read`.
 * Assumed contract: `{ balance, reserved, creditLimit, available }`, money as 4-decimal strings.
 * @route GET /admin/clients/:id/wallet
 */
export function getClientWallet(id: Id, init?: ApiInit): Promise<ClientWallet> {
  return apiGet<ClientWallet>(pathOf('/admin/clients/:id/wallet', { id }), undefined, init);
}

/**
 * The merchant's statement: the ledger entries on the wallet, one page of them, with the total in `x-total-count`.
 * Sort with `_sort=createdAt&_order=desc` (newest first). Needs `wallet:read`.
 * Assumed contract: each row carries a signed `amount` (from the merchant's side) and the running `balanceAfter`.
 * @route GET /admin/clients/:id/statement
 */
export function listClientStatement(
  id: Id,
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<StatementRow>> {
  return apiList<StatementRow>(pathOf('/admin/clients/:id/statement', { id }), query, undefined, init);
}

/**
 * Adds to or takes from the wallet by hand, with a reason that goes to the ledger and the audit log. The server posts
 * the balanced entries and refuses what it must (for example a debit that would pass the credit limit); the console
 * never works out a balance. Needs `wallet:adjust`.
 * Assumed contract: body `{ amount, direction, reason }` with a positive 4-decimal `amount`, answer `{ transactionId, wallet }`.
 * @route POST /admin/clients/:id/wallet/adjust
 */
export function adjustClientWallet(
  id: Id,
  body: AdjustWalletBody,
  init?: ApiInit,
): Promise<AdjustWalletResult> {
  return apiPost<AdjustWalletResult>(pathOf('/admin/clients/:id/wallet/adjust', { id }), body, init);
}

/**
 * Sets how far below zero the merchant's wallet may go. Zero removes the credit. Needs `wallet:credit_limit`.
 * Assumed contract: body `{ creditLimit }`, answer the wallet afterwards.
 * @route PATCH /admin/clients/:id/credit-limit
 */
export function setClientCreditLimit(id: Id, body: CreditLimitBody, init?: ApiInit): Promise<ClientWallet> {
  return apiPatch<ClientWallet>(pathOf('/admin/clients/:id/credit-limit', { id }), body, init);
}

/**
 * Downloads the official account statement of a merchant (the file accountants keep). The name comes from the server's
 * `Content-Disposition`, else `statement-<id>.pdf`; the name used is returned. Needs `reports:read`.
 * Assumed contract: the answer is a file.
 * @route GET /admin/reports/client-statement/:clientId
 */
export function downloadClientStatement(clientId: Id, init?: ApiInit): Promise<string> {
  return apiDownload(
    pathOf('/admin/reports/client-statement/:clientId', { clientId }),
    undefined,
    `statement-${clientId}.pdf`,
    init,
  );
}
