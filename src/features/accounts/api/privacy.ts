// The privacy side of an account (`/admin/clients/:id/privacy|block|export|anonymize`). The read needs `clients:read`, block needs
// `clients:block`, export and anonymize need `customers:privacy`. Ports the `cu-export-data` action of 48-p-customers.js and
// exportCustomerData / anonymizeCustomer / blockCustomer of 12-state-b2c.js, for every rank.
import { apiDownload, apiGet, apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { AccountPrivacy, BlockAccountBody } from '../types';

/**
 * The privacy facts of one account: the marketing choice, the consent records of its latest shop order and the risk summary
 * (the highest score on any order and the signals behind it).
 * Assumed contract: `{ marketingOptIn, latestConsents: { orderId, records } | null, risk: { highestScore, signals } }`.
 * @route GET /admin/clients/:id/privacy
 */
export function getAccountPrivacy(id: Id, init?: ApiInit): Promise<AccountPrivacy> {
  return apiGet<AccountPrivacy>(pathOf('/admin/clients/:id/privacy', { id }), undefined, init);
}

/**
 * Blocks an account for fraud, with a reason (the server adds the email, the card fingerprints and the IMEIs of its shop orders to
 * the blocklist, ends its sessions and stops its API keys), or lifts the block (only what the block added leaves the blocklist).
 * For a pause use `updateAccount` with a suspension.
 * Assumed contract: body `{ blocked: true, reason }` or `{ blocked: false }`, answer 204.
 * @route POST /admin/clients/:id/block
 */
export function blockAccount(id: Id, body: BlockAccountBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/clients/:id/block', { id }), body, init);
}

/**
 * Downloads everything the system holds about one account as a JSON file, for a data-protection request (never a key or a
 * password; a retail account with a proven email also holds the orders placed as a guest with that email). The file name comes
 * from the server's `Content-Disposition`, else `account-<id>.json`; the name used is returned.
 * Assumed contract: the answer is a JSON file; the server may mark the account's open export request done.
 * @route GET /admin/clients/:id/export
 */
export function exportAccountData(id: Id, init?: ApiInit): Promise<string> {
  return apiDownload(pathOf('/admin/clients/:id/export', { id }), undefined, `account-${id}.json`, init);
}

/**
 * Anonymizes an account of the retail rank: the name, email and IMEIs are replaced while payment records stay for accounting, and
 * a guest record with the same proven email is erased too. It cannot be undone. A merchant rank answers 409 (move it to the retail
 * rank first); an open checkout or a pending payment refuses the erasure with 409. The server may mark the account's open erasure
 * request done.
 * Assumed contract: no body, answer 204.
 * @route POST /admin/clients/:id/anonymize
 */
export function anonymizeAccount(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/clients/:id/anonymize', { id }), undefined, init);
}
