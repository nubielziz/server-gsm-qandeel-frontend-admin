// MerchantVerificationTab: the "Verification" tab of a merchant's page (feature 20): the merchant's current verification state and
// their requests, newest first, with the same side sheet as the Merchants list (`?kyc=<id>`, Approve and Reject). A decision
// refreshes this list and the page header, because the decision mutation makes the merchant and the requests stale.
import { useState } from 'react';
import { Badge, EmptyState, usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useKycDrawer, useKycList } from '../hooks/useKycSubmissions';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { PAGE_SIZE } from '../lib/filters';
import { CLIENT_KYC_BADGE } from '../lib/kyc';
import type { Client } from '../types';
import { KycDrawer } from './KycDrawer';
import { KycTable } from './KycTable';

/** Shows the merchant's verification status and requests. Needs `kyc:read` (the tab is left out without it). */
export function MerchantVerificationTab({ client, grants }: { client: Client; grants: MerchantGrants }) {
  const now = useNow();
  const drawer = useKycDrawer();
  const [page, setPage] = useState(1);
  const { submissions, total, query } = useKycList({
    filter: 'all',
    page,
    pageSize: PAGE_SIZE,
    clientId: client.id,
  });
  usePageClamp({
    page,
    pageSize: PAGE_SIZE,
    total,
    settled: query.isSuccess && !query.isPlaceholderData,
    setPage,
  });
  // A status the console does not know shows the server's word in grey.
  const look = Object.hasOwn(CLIENT_KYC_BADGE, client.kycStatus)
    ? CLIENT_KYC_BADGE[client.kycStatus]
    : { tone: 'neutral' as const, icon: 'info' as const, label: client.kycStatus };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-3 text-sm">
        <span className="text-ink3">Verification status</span>
        <Badge tone={look.tone} icon={look.icon}>
          {look.label}
        </Badge>
      </div>
      <KycTable
        single
        rows={submissions}
        state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
        error={query.error}
        onRetry={() => void query.refetch()}
        now={now}
        pagination={{ page, pageSize: PAGE_SIZE, total: total ?? submissions.length }}
        onPageChange={setPage}
        onOpen={(submission) => drawer.open(submission.id)}
        empty={
          <EmptyState icon="inbox" title="No verification requests">
            This merchant has not submitted documents yet.
          </EmptyState>
        }
      />
      {drawer.id !== null && (
        <KycDrawer
          key={drawer.id}
          id={drawer.id}
          row={submissions.find((submission) => submission.id === drawer.id)}
          grants={grants}
          onClose={drawer.close}
        />
      )}
    </>
  );
}
