// BillingTab: the "Billing" tab of a merchant's page (feature 20): the merchant's invoices and payments from the Finance feature,
// ten rows a page each, with links to the invoice and the deposit. A section whose permission the staff member lacks
// (`invoices:read`, `payments:read`) is left out; the tab itself needs either one.
import { useState } from 'react';
import { usePageClamp } from '@/components/ui';
import { useMerchantInvoices, useMerchantPayments } from '../hooks/useMerchantBilling';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { BILLING_PAGE_SIZE } from '../lib/billing';
import type { Client } from '../types';
import { MerchantInvoicesTable } from './MerchantInvoicesTable';
import { MerchantPaymentsTable } from './MerchantPaymentsTable';

const stateOf = (query: { isLoading: boolean; isError: boolean }) =>
  query.isLoading ? 'loading' : query.isError ? 'error' : 'ready';

/** Shows the invoices section and the payments section, each only with its read permission. */
export function BillingTab({ client, grants }: { client: Client; grants: MerchantGrants }) {
  const canInvoices = grants.can('invoices:read');
  const canPayments = grants.can('payments:read');
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const invoices = useMerchantInvoices(client.id, invoicePage, canInvoices);
  const payments = useMerchantPayments(client.id, paymentPage, canPayments);
  const invoiceTotal = invoices.data?.total ?? 0;
  const paymentTotal = payments.data?.total ?? 0;
  usePageClamp({
    page: invoicePage,
    pageSize: BILLING_PAGE_SIZE,
    total: invoiceTotal,
    settled: invoices.isSuccess && !invoices.isPlaceholderData,
    setPage: setInvoicePage,
  });
  usePageClamp({
    page: paymentPage,
    pageSize: BILLING_PAGE_SIZE,
    total: paymentTotal,
    settled: payments.isSuccess && !payments.isPlaceholderData,
    setPage: setPaymentPage,
  });

  return (
    <div className="space-y-5 p-3.5">
      {canInvoices && (
        <section aria-label="Invoices">
          <h3 className="mb-2 text-sm font-semibold">Invoices</h3>
          <div className="rounded-lg border border-line">
            <MerchantInvoicesTable
              rows={invoices.data?.data ?? []}
              state={stateOf(invoices)}
              error={invoices.error}
              onRetry={() => void invoices.refetch()}
              total={invoiceTotal}
              page={invoicePage}
              onPageChange={setInvoicePage}
            />
          </div>
        </section>
      )}
      {canPayments && (
        <section aria-label="Payments">
          <h3 className="mb-2 text-sm font-semibold">Payments</h3>
          <div className="rounded-lg border border-line">
            <MerchantPaymentsTable
              rows={payments.data?.data ?? []}
              state={stateOf(payments)}
              error={payments.error}
              onRetry={() => void payments.refetch()}
              total={paymentTotal}
              page={paymentPage}
              onPageChange={setPaymentPage}
            />
          </div>
        </section>
      )}
    </div>
  );
}
