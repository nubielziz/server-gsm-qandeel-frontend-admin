// KycDrawer: one verification request in a side sheet: the merchant, the dates, the reviewer's note and the uploaded documents,
// with Approve and Reject for a request that is still pending. A screen the demo lacks (MISMATCHES M47). The documents are plain
// links to `/admin/files/:id` (the server redirects to a short-lived signed address), so they need `files:read`.
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, Drawer, ErrorState, KeyValue, SkeletonTable } from '@/components/ui';
import { ago, fmtDate } from '@/lib/format';
import { kycFileUrl } from '../api';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { useKycSubmission } from '../hooks/useKycSubmissions';
import { documentsOf } from '../lib/kyc';
import { merchantPath } from '../lib/paths';
import type { KycDecision, KycSubmission } from '../types';
import { KycDecisionDialog } from './KycDecisionDialog';
import { KycStatusBadge } from './KycStatusBadge';
import { MerchantStatusBadge } from './MerchantStatusBadge';

export interface KycDrawerProps {
  id: number;
  /** The list row, shown at once while the single read loads. */
  row?: KycSubmission;
  grants: MerchantGrants;
  onClose: () => void;
}

/** Shows one request in a side sheet, with its documents and the decision buttons while it is pending. */
export function KycDrawer({ id, row, grants, onClose }: KycDrawerProps) {
  const { submission, query } = useKycSubmission(id, row);
  const [decision, setDecision] = useState<KycDecision | null>(null);
  const decideLock = grants.needs('kyc:decide');
  const fileLock = grants.needs('files:read');
  const documents = submission ? documentsOf(submission) : [];

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={submission ? `Verification of ${submission.client.name}` : 'Verification request'}
        badges={submission && <KycStatusBadge status={submission.status} />}
        sub={submission ? `Submitted ${ago(submission.createdAt)}` : undefined}
        footer={
          submission?.status === 'pending' && (
            <>
              <Button
                variant="danger"
                disabled={decideLock.disabled}
                title={decideLock.title}
                onClick={() => setDecision('reject')}
              >
                Reject…
              </Button>
              <Button
                variant="primary"
                disabled={decideLock.disabled}
                title={decideLock.title}
                onClick={() => setDecision('approve')}
              >
                Approve
              </Button>
            </>
          )
        }
      >
        {!submission && query.isError ? (
          <ErrorState
            title="Could not load the request"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : !submission ? (
          <SkeletonTable cols={2} rows={5} />
        ) : (
          <div className="space-y-5">
            <KeyValue
              rows={[
                [
                  'Merchant',
                  <Link key="m" className="link" to={merchantPath(submission.clientId)}>
                    {submission.client.name}
                  </Link>,
                ],
                ['Email', submission.client.email],
                [
                  'Country',
                  <span key="c" className="mono">
                    {submission.client.country}
                  </span>,
                ],
                ['Account', <MerchantStatusBadge key="s" status={submission.client.status} />],
                ['Submitted', fmtDate(submission.createdAt)],
                submission.reviewedAt
                  ? [
                      'Reviewed',
                      `${fmtDate(submission.reviewedAt)} by ${submission.reviewedBy?.name ?? 'staff'}`,
                    ]
                  : null,
                submission.note ? ['Note', submission.note] : null,
              ]}
            />
            <section aria-label="Documents">
              <h3 className="mb-2 text-sm font-semibold">Documents</h3>
              {documents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line2 p-4 text-sm text-ink3">
                  No documents were uploaded with this request.
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {documents.map((file) => (
                    <li key={file.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      {fileLock.disabled ? (
                        <span className="truncate text-ink2" title={fileLock.title}>
                          {file.label}
                        </span>
                      ) : (
                        <a
                          className="link truncate"
                          href={kycFileUrl(file.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {file.label}
                        </a>
                      )}
                      {file.size && <span className="flex-none text-xs text-ink3">{file.size}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Drawer>
      {submission && decision && (
        <KycDecisionDialog submission={submission} decision={decision} onClose={() => setDecision(null)} />
      )}
    </>
  );
}
