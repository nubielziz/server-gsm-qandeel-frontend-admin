// PaymentDetails: the facts of one deposit inside its dialog: a warning or the rejection reason, then merchant, dates,
// reference, receipt and the amounts. Ports the body of payDialog in 45-p-finance.js. "Spend, 30 days" and the wallet-after
// preview are not here (MISMATCHES M127): the deposit does not carry them and the server posts the credit.
import { Link } from 'react-router';
import { Icon, KeyValue } from '@/components/ui';
import { ago, fmtDate, money } from '@/lib/format';
import { fileDownloadUrl } from '../api/lookups';
import { feeText } from '../lib/payments';
import type { Payment } from '../types';

export interface PaymentDetailsProps {
  payment: Payment;
  now: number;
  /** Whether the staff member may download files (`files:read`); without it the receipt is only named. */
  canOpenFiles: boolean;
}

export function PaymentDetails({ payment, now, canOpenFiles }: PaymentDetailsProps) {
  const fresh = payment.status === 'pending';
  const client = payment.client;
  const reviewer = payment.reviewedBy?.name;
  return (
    <div className="space-y-3">
      {fresh && payment.note && (
        <div className="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg" role="note">
          <Icon name="alert" className="mt-px flex-none" />
          <span>{payment.note}</span>
        </div>
      )}
      {payment.status === 'rejected' && (
        <div className="flex gap-2 rounded-md bg-crit-bg p-2.5 text-sm text-crit-fg" role="note">
          <Icon name="xCircle" className="mt-px flex-none" />
          <span>
            Rejected{reviewer ? ` by ${reviewer}` : ''}
            {payment.reviewedAt ? ` ${ago(payment.reviewedAt, now)}` : ''}
            {payment.note ? `: ${payment.note}` : ''}
          </span>
        </div>
      )}
      <KeyValue
        className="!grid-cols-[120px_1fr]"
        rows={[
          [
            'Merchant',
            client ? (
              <>
                <Link className="link" to={`/merchants/${client.id}`}>
                  {client.name}
                </Link>
                {client.group && <span className="text-ink3"> · {client.group}</span>}
              </>
            ) : (
              '–'
            ),
          ],
          ['Submitted', `${fmtDate(payment.createdAt)} (${ago(payment.createdAt, now)})`],
          payment.gatewayTxnId
            ? ['Reference', <span className="mono break-all">{payment.gatewayTxnId}</span>]
            : null,
          payment.receiptFileId !== null && [
            'Receipt',
            canOpenFiles ? (
              <a
                className="link inline-flex items-center gap-1.5"
                href={fileDownloadUrl(payment.receiptFileId)}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="file" className="ic-sm text-ink3" />
                Open the proof of payment
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="file" className="ic-sm text-ink3" />
                Proof of payment attached
              </span>
            ),
          ],
          ['Amount paid', <span className="font-medium tabular-nums">{money(payment.amount)}</span>],
          ['Fee', <span className="tabular-nums">{feeText(payment)}</span>],
          [
            'Credited to wallet',
            <span className="font-medium tabular-nums">{money(payment.netAmount)}</span>,
          ],
          client?.walletBalance != null && [
            'Wallet now',
            <span className="tabular-nums">{money(client.walletBalance)}</span>,
          ],
          payment.status === 'approved' && reviewer
            ? ['Approved by', `${reviewer}${payment.reviewedAt ? ` ${ago(payment.reviewedAt, now)}` : ''}`]
            : null,
        ]}
      />
      {fresh && (
        <p className="text-xs text-ink3">
          Check that the amount on the proof matches the amount above before approving. Approval credits the
          wallet immediately.
        </p>
      )}
    </div>
  );
}
