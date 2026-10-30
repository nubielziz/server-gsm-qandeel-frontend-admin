// VerificationTab: the "Verification" tab, which the demo lacks and the map adds (`GET /admin/kyc-submissions`, MISMATCHES M47): the
// requests filtered by status, newest first, and a drawer for one of them. The filter, the page and the open request live in
// the address (`?tab=verification&kycStatus=approved&page=2&kyc=7`). It fills the page's panel under the tab strip.
import { Button, EmptyState, SelectField, TableToolbar, usePageClamp } from '@/components/ui';
import { num, useNow } from '@/lib/format';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { useKycDrawer, useKycList } from '../hooks/useKycSubmissions';
import { KYC_FILTERS, PAGE_SIZE, type KycFilter } from '../lib/filters';
import { KYC_FILTER_LABEL } from '../lib/kyc';
import { KycDrawer } from './KycDrawer';
import { KycTable } from './KycTable';

export interface VerificationTabProps {
  grants: MerchantGrants;
  filter: KycFilter;
  page: number;
  onFilterChange: (filter: KycFilter) => void;
  onPageChange: (page: number) => void;
}

/** The list of verification requests with its status filter, and the drawer of the open one. */
export function VerificationTab({
  grants,
  filter,
  page,
  onFilterChange,
  onPageChange,
}: VerificationTabProps) {
  const now = useNow();
  const drawer = useKycDrawer();
  const { submissions, total, query } = useKycList({ filter, page, pageSize: PAGE_SIZE });
  // A shrinking list (a decision moves a request out of the filter, an old link) must not leave the table on an empty page.
  usePageClamp({
    page,
    pageSize: PAGE_SIZE,
    total,
    settled: query.isSuccess && !query.isPlaceholderData,
    setPage: onPageChange,
  });

  return (
    <>
      <TableToolbar
        count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'request' : 'requests'}`}
      >
        <SelectField
          aria-label="Filter by status"
          value={filter}
          options={KYC_FILTERS.map((value) => ({ value, label: KYC_FILTER_LABEL[value] }))}
          onChange={(event) => onFilterChange(event.target.value as KycFilter)}
        />
      </TableToolbar>
      <div className="border-t border-line">
        <KycTable
          rows={submissions}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          onRetry={() => void query.refetch()}
          now={now}
          pagination={{ page, pageSize: PAGE_SIZE, total: total ?? submissions.length }}
          onPageChange={onPageChange}
          onOpen={(submission) => drawer.open(submission.id)}
          empty={
            filter === 'pending' ? (
              <EmptyState
                icon="checkCircle"
                title="Nothing is waiting for a decision"
                cta={<Button onClick={() => onFilterChange('all')}>Show all requests</Button>}
              >
                Merchants who upload their documents appear here for you to approve or reject.
              </EmptyState>
            ) : (
              <EmptyState icon="inbox" title="No requests">
                {filter === 'all'
                  ? 'No merchant has submitted documents yet.'
                  : `No ${KYC_FILTER_LABEL[filter].toLowerCase()} requests.`}
              </EmptyState>
            )
          }
        />
      </div>
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
