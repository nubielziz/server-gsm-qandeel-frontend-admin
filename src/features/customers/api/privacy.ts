// Privacy actions on a customer (`/admin/customers/:id/export` and `/anonymize`). Ports the `cu-export-data` action of
// 48-p-customers.js and exportCustomerData / anonymizeCustomer of 12-state-b2c.js. Both need `customers:privacy`.
import { apiDownload, apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';

/**
 * Downloads everything the system holds about one customer as a JSON file, for a data-protection request. The file name
 * comes from the server's `Content-Disposition`, else `customer-<id>.json`; the name used is returned.
 * Assumed contract: the answer is a JSON file; the server may mark the customer's open export request done.
 * @route GET /admin/customers/:id/export
 */
export function exportCustomerData(id: Id, init?: ApiInit): Promise<string> {
  return apiDownload(pathOf('/admin/customers/:id/export', { id }), undefined, `customer-${id}.json`, init);
}

/**
 * Anonymises a customer: the name, email and IMEIs are replaced while payment records stay for accounting. It cannot be
 * undone. The server may mark the customer's open erasure request done.
 * Assumed contract: no body, answer 204.
 * @route POST /admin/customers/:id/anonymize
 */
export function anonymizeCustomer(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/customers/:id/anonymize', { id }), undefined, init);
}
