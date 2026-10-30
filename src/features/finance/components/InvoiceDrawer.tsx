// InvoiceDrawer: the side sheet of one invoice: who it is billed to, the amounts the server worked out, the dates and the PDF
// copy. New in the console (MISMATCHES M123). A link (`?invoice=7`) has no list row, so it loads the invoice first.
import { Link } from 'react-router';
import { Drawer, ErrorState, Icon, KeyValue, SkeletonTable, TypeTag } from '@/components/ui';
import { ago, fmtDate, money, pct, toAmount, useNow } from '@/lib/format';
import { fileDownloadUrl } from '../api/lookups';
import type { FinanceGrants } from '../hooks/useFinanceGrants';
import { useInvoice } from '../hooks/useInvoice';
import { billedTo, invoiceKindLabel } from '../lib/invoices';
import type { Invoice } from '../types';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

export interface InvoiceDrawerProps {
  id: number;
  /** The row from the list, shown at once while the single read loads. */
  row?: Invoice;
  grants: FinanceGrants;
  onClose: () => void;
}

function Details({ invoice, grants }: { invoice: Invoice; grants: FinanceGrants }) {
  const who = billedTo(invoice);
  const taxed = toAmount(invoice.taxAmount) > 0;
  return (
    <KeyValue
      className="!grid-cols-[120px_1fr]"
      rows={[
        [
          'Billed to',
          who.href ? (
            <Link className="link" to={who.href}>
              {who.name}
            </Link>
          ) : (
            who.name
          ),
        ],
        invoice.description ? ['For', invoice.description] : null,
        ['Amount', <span className="tabular-nums">{money(invoice.amount)}</span>],
        toAmount(invoice.fee) > 0 && ['Fee', <span className="tabular-nums">{money(invoice.fee)}</span>],
        taxed && [
          'VAT',
          <span className="tabular-nums">
            {money(invoice.taxAmount)} ({pct(invoice.taxRate)} {invoice.taxCountry})
          </span>,
        ],
        invoice.customerVatId ? ['VAT ID', <span className="mono">{invoice.customerVatId}</span>] : null,
        ['Total', <span className="font-medium tabular-nums">{money(invoice.total)}</span>],
        invoice.dueAt ? ['Due', fmtDate(invoice.dueAt)] : null,
        invoice.paidAt ? ['Paid', fmtDate(invoice.paidAt)] : null,
        invoice.orderId !== null && [
          'Order',
          <Link className="link" to={`/orders?order=${invoice.orderId}`}>
            #{invoice.orderId}
          </Link>,
        ],
        invoice.pdfFileId !== null && [
          'PDF copy',
          grants.can('files:read') ? (
            <a
              className="link inline-flex items-center gap-1.5"
              href={fileDownloadUrl(invoice.pdfFileId)}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="file" className="ic-sm text-ink3" />
              Download the PDF
            </a>
          ) : (
            'Attached'
          ),
        ],
      ]}
    />
  );
}

export function InvoiceDrawer({ id, row, grants, onClose }: InvoiceDrawerProps) {
  const { invoice, query } = useInvoice(id, row);
  const now = useNow();

  if (!invoice) {
    return (
      <Drawer open onClose={onClose} title={`Invoice ${id}`} titleClassName="mono">
        {query.isError ? (
          <ErrorState
            title="Could not load this invoice"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <SkeletonTable cols={2} rows={6} />
        )}
      </Drawer>
    );
  }
  return (
    <Drawer
      open
      onClose={onClose}
      title={invoice.number}
      titleClassName="mono"
      badges={
        <>
          <InvoiceStatusBadge status={invoice.status} />
          <TypeTag>{invoiceKindLabel(invoice.kind)}</TypeTag>
        </>
      }
      sub={`Issued ${fmtDate(invoice.createdAt)} · ${ago(invoice.createdAt, now)}`}
    >
      <Details invoice={invoice} grants={grants} />
    </Drawer>
  );
}
