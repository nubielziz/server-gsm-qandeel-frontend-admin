// "Issue manual invoice": bills a merchant for an amount. The dialog shows a failed call itself (under the field the server
// named, or in its error slot), so this toasts only the success.
import { useApiMutation } from '@/lib/query';
import { money } from '@/lib/format';
import { createInvoice } from '../api';
import type { CreateInvoiceBody } from '../types';

export function useCreateInvoice() {
  return useApiMutation({
    mutationFn: (body: CreateInvoiceBody) => createInvoice(body),
    invalidates: [{ resource: 'invoices' }],
    successNotification: (invoice) => ({
      message: `Invoice ${invoice.number} issued`,
      description: `${money(invoice.total)} billed to ${invoice.client?.name ?? 'the merchant'}.`,
    }),
    errorNotification: () => false,
  });
}
