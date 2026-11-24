// Account routes (`/admin/clients*`): the one list of every account, the record, the counts, create, edit, status, "make an account",
// the rank change and the lookup of old numbers. Ports the data side of pageMerchants / pageMerchant (42-p-merchants.js) and
// pageCustomers / pageCustomer (48-p-customers.js) as one. The map gives no bodies (MISMATCHES M10), so every body
// and answer here is an assumed contract.
import {
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
  AccountCounts,
  AccountDetail,
  AccountRow,
  ChangeRankBody,
  CreateAccountBody,
  CreateAccountResult,
  LegacyAccount,
  LegacyAccountType,
  MakeAccountBody,
  PasswordResult,
  RankChangeResult,
  UpdateAccountBody,
} from '../types';
import { idempotencyHeaders, keyedWrite } from './headers';

/**
 * Every account, one page of them, with the total in `x-total-count`. Filters: `id`, `status` (an array repeats the key),
 * `rankId`, `rankKind` (retail or merchant; none means every account), `hasAccount`, `invitationPending`, `country`; `q` searches name,
 * email, company and username; sort with `_sort`/`_order` (`name`, `createdAt`, `id`, `status`, `country`, `rank`, `ordersCount`,
 * `lastOrderAt`, and `balance`, which needs `wallet:read`). Other features use it for account menus and searches.
 * Assumed contract: rows carry the joined `rank`, and for staff who can read wallets the `wallet` and 30-day `stats` figures.
 * @route GET /admin/clients
 */
export function listAccounts(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<AccountRow>> {
  return apiList<AccountRow>('/admin/clients', query, undefined, init);
}

/**
 * The numbers of the strip and the status menu, from one aggregate over every account (never cached, independent of the
 * toolbar). Needs `clients:read`.
 * Assumed contract: `{ all, retail, merchant, guests, active, suspended, blocked, anonymized, invitationPending }`.
 * @route GET /admin/clients/counts
 */
export function getAccountCounts(init?: ApiInit): Promise<AccountCounts> {
  return apiGet<AccountCounts>('/admin/clients/counts', undefined, init);
}

/**
 * One account for the record page and to refresh it after an action: the row plus its sign-in facts, for any rank and status.
 * The server answers 404 for an id that does not exist (the page then says so).
 * Assumed contract: same shape as a list row, `security` included.
 * @route GET /admin/clients/:id
 */
export function getAccount(id: Id, init?: ApiInit): Promise<AccountDetail> {
  return apiGet<AccountDetail>(pathOf('/admin/clients/:id', { id }), undefined, init);
}

/**
 * Adds an account. A retail account takes no `groupId`, company or credit limit; a merchant rank needs the Owner. The server
 * makes it active at once and either emails a link to choose a password or, for `temporary_password`, returns one once. It
 * answers 409 `EMAIL_TAKEN` for an address another login account uses, and for an address a guest bought with (field `email`,
 * code `guest`: make that guest an account instead).
 * Assumed contract: body `{ name, email, country, phone?, company?, groupId?, creditLimit?, password?: { mode } }`, answer 201 with the row.
 * @route POST /admin/clients
 */
export function createAccount(body: CreateAccountBody, init?: ApiInit): Promise<CreateAccountResult> {
  return apiPost<CreateAccountResult>('/admin/clients', body, init);
}

/**
 * Changes an account, one kind of change per call: suspend (`status: 'suspended'` with a `reason` of 3 to 140 characters),
 * reactivate (`status: 'active'`), or the details (`name`, `company`, `phone`, `country`, `email`, `address`, `taxId`,
 * `internalNotes`; several at once). Only the fields that change are sent. A `groupId` is refused (422, code `use_rank_route`):
 * use `changeAccountRank`. Changing the email of a login account cancels open links, clears verification and mails the new address.
 * The server refuses a change that is not allowed (`INVALID_TRANSITION` 409, `EMAIL_TAKEN` 409, `ANONYMIZED` 409, `RATE_LIMITED` 429).
 * Assumed contract: body `{ status?, reason? }` or the details, answer the updated row.
 * @route PATCH /admin/clients/:id
 */
export function updateAccount(id: Id, body: UpdateAccountBody, init?: ApiInit): Promise<AccountRow> {
  return apiPatch<AccountRow>(pathOf('/admin/clients/:id', { id }), body, init);
}

/**
 * Makes an account of a guest (a record a checkout made): the guest gets a login on the retail rank and their orders stay on
 * it, with either a link to choose a password or a temporary one the server makes and returns once. 409 `ACCOUNT_EXISTS` for an
 * account that has a login, 409 `EMAIL_TAKEN` (code `login_exists`) when another login account uses the email.
 * Assumed contract: body `{ mode }`, answer `{ temporaryPassword? }`.
 * @route POST /admin/clients/:id/account
 */
export function makeAccount(id: Id, body: MakeAccountBody, init?: ApiInit): Promise<PasswordResult> {
  return apiPost<PasswordResult>(pathOf('/admin/clients/:id/account', { id }), body, init);
}

/**
 * Moves an account to another rank. Owner only; the `Idempotency-Key` header is required and makes a retry of one dialog opening
 * change once (another body with the same key is 409 `IDEMPOTENCY_KEY_REUSED`, worded for staff by `keyedWrite`). Across kinds the server moves the balance from one
 * wallet to the other, ends every session and, when the account leaves the merchant kind, revokes every API key. It refuses with
 * 409 `RANK_CHANGE_BLOCKED` and one blocker per reason (see `lib/rankChangeBlockers.ts`); nothing is written then.
 * Assumed contract: body `{ groupId }`, answer `{ rank, wallet, movedAmount, transactionId, sessionsEnded, apiKeysRevoked }`.
 * @route POST /admin/clients/:id/rank
 */
export function changeAccountRank(
  id: Id,
  body: ChangeRankBody,
  idempotencyKey: string,
  init?: ApiInit,
): Promise<RankChangeResult> {
  return keyedWrite(
    apiPost<RankChangeResult>(
      pathOf('/admin/clients/:id/rank', { id }),
      body,
      idempotencyHeaders(idempotencyKey, init),
    ),
  );
}

/**
 * Finds the account behind a number of the old model (a merchant, `client` or customer record): the console never guesses, it asks.
 * The server answers 404 when no account came from that record.
 * Assumed contract: answer `{ accountId }`.
 * @route GET /admin/legacy-accounts/:type/:id
 */
export function findLegacyAccount(type: LegacyAccountType, id: Id, init?: ApiInit): Promise<LegacyAccount> {
  return apiGet<LegacyAccount>(pathOf('/admin/legacy-accounts/:type/:id', { type, id }), undefined, init);
}
