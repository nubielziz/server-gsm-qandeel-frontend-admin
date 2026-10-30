// Types for the invoices routes (`/admin/invoices*`): top-up invoices, manual invoices issued by staff and the tax receipts
// of storefront orders. The demo has no invoices page, so this is new (MISMATCHES M123). The map gives no bodies (MISMATCHES
// M10), so every shape is an assumed contract, built from `InvoiceRow` in `src/lib/api/schema.gen.ts`.
import type { Id, Money } from '@/lib/api';
import type { InvoiceRow } from '@/lib/api/schema.gen';

/** What the invoice is for. `manual` is the kind staff issue from the console. */
export type InvoiceKind = 'topup' | 'manual' | 'receipt' | 'statement';

/** Where an invoice stands: waiting for payment, paid, or cancelled. */
export type InvoiceStatus = 'open' | 'paid' | 'void';

/** A merchant or customer named in a join. */
export type InvoiceParty = { id: Id; name: string };

/**
 * One invoice, as `GET /admin/invoices` and `GET /admin/invoices/:id` send it (assumed contract). A merchant's invoice
 * has `client`; a storefront customer's tax receipt has `customer` (with the email, which the console masks). The
 * amounts are the server's: `amount` before fee and tax, `total` what is billed.
 */
export type Invoice = Pick<
  InvoiceRow,
  | 'id'
  | 'number'
  | 'amount'
  | 'fee'
  | 'netAmount'
  | 'taxAmount'
  | 'taxRate'
  | 'taxCountry'
  | 'customerVatId'
  | 'total'
  | 'dueAt'
  | 'paidAt'
  | 'createdAt'
> & {
  kind: InvoiceKind;
  status: InvoiceStatus;
  /** The currency code (`USD`); the row itself holds the currency id. */
  currency: string;
  client: InvoiceParty | null;
  customer: (InvoiceParty & { email: string }) | null;
  orderId: Id | null;
  /** The PDF copy, a file the `files:read` permission can download. */
  pdfFileId: Id | null;
  /** What a manual invoice bills for. */
  description: string | null;
};

/** The filters `GET /admin/invoices` understands besides paging, sorting and `q` (assumed contract). */
export type InvoiceFilters = {
  status?: InvoiceStatus;
  kind?: InvoiceKind;
  clientId?: Id;
};

/**
 * Body of `POST /admin/invoices` (assumed contract): bill a merchant for an amount. `amount` is a 4-decimal money
 * string; the server adds tax, numbers the invoice and answers the new one.
 */
export type CreateInvoiceBody = { clientId: Id; amount: Money; description: string };

/** The merchant names the issue dialog offers (a private lookup on the merchants route). */
export type MerchantOption = { id: Id; name: string };
