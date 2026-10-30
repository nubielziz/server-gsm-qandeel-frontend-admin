// Customer reads and edits (`/admin/customers`, `/admin/customers/:id`). Ports the data side of pageCustomers and pageCustomer
// (48-p-customers.js) and createCustomer / updateCustomer of 12-state-b2c.js. The map gives no bodies (MISMATCHES M10),
// so every shape here is an assumed contract.
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
  CreateCustomerBody,
  CreateCustomerResult,
  Customer,
  CustomerDetail,
  UpdateCustomerBody,
} from '../types';

/**
 * Storefront customers, one page of them, with the total in `x-total-count`. Filters: `q` (name and email), `country`,
 * `status`, `riskLevel` (an array repeats the key) and `hasAccount`; sort with `_sort`/`_order`. The tab counts and the
 * "have an account" figure are this call with `_start=0&_end=1`.
 * Assumed contract: rows carry `ordersCount` and `lastOrderAt` next to the `customers` columns.
 * @route GET /admin/customers
 */
export function listCustomers(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Customer>> {
  return apiList<Customer>('/admin/customers', query, undefined, init);
}

/**
 * One customer with the figures, the account, the latest consent records and the risk summary, for the detail page. The
 * server answers 404 for an id that does not exist (the page then says so).
 * Assumed contract: the list row plus `stats`, `account` (null for a guest), `latestConsents` and `risk`.
 * @route GET /admin/customers/:id
 */
export function getCustomer(id: Id, init?: ApiInit): Promise<CustomerDetail> {
  return apiGet<CustomerDetail>(pathOf('/admin/customers/:id', { id }), undefined, init);
}

/**
 * Adds a customer with an account, for someone who asks the team to sign them up or orders by phone: either an emailed
 * link to choose a password, or a temporary password the server makes and returns once (`temporaryPassword`). Marketing
 * emails stay off. The server answers 409 `EMAIL_TAKEN` for an address another customer already uses.
 * Assumed contract: body `{ name, email, country, locale, phone?, password: { mode } }`, answer 201 with the new customer.
 * @route POST /admin/customers
 */
export function createCustomer(body: CreateCustomerBody, init?: ApiInit): Promise<CreateCustomerResult> {
  return apiPost<CreateCustomerResult>('/admin/customers', body, init);
}

/**
 * Edits a customer's name, email, country, language, phone or internal notes; only the fields that change are sent. A new
 * email cancels the verification of an account. The change is written to the audit log by the server.
 * Assumed contract: body `{ name?, email?, country?, locale?, phone?, internalNotes? }`, answer the updated customer.
 * @route PATCH /admin/customers/:id
 */
export function updateCustomer(id: Id, body: UpdateCustomerBody, init?: ApiInit): Promise<Customer> {
  return apiPatch<Customer>(pathOf('/admin/customers/:id', { id }), body, init);
}
