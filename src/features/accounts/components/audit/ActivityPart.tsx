// ActivityPart: the "Activity Log" part of an account's record: every change staff made to the account (and what the system did to it),
// newest first, with the footer pager, and a link that opens the audit log filtered to this account. The part is read-only. Page and size
// are the part's own state (the address of the record names the account and the part, nothing else).
import { useState } from 'react';
import { Link } from 'react-router';
import { EmptyState, FooterPager, usePageClamp } from '@/components/ui';
import { auditAccountPath } from '@/features/audit';
import { accountLabel } from '../shared/accountLabel';
import type { AccountPartProps } from '../types';
import { ActivityTable } from './ActivityTable';
import { ACTIVITY_PAGE_SIZE, useAccountAudit } from './useAccountAudit';

/**
 * The entries about the account. The part is offered only with `audit:read` (the registry's rule), so it asks for nothing a role may not
 * read. Changing the page size goes back to page 1; a list that shrank under the page being shown goes back to its last page.
 */
export function ActivityPart({ account, grants }: AccountPartProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(ACTIVITY_PAGE_SIZE);
  const audit = useAccountAudit(account.id, page, size, grants.ready);
  const rows = audit.data?.data ?? [];
  const total = audit.data?.total;
  usePageClamp({
    page,
    pageSize: size,
    total,
    settled: audit.isSuccess && !audit.isPlaceholderData,
    setPage,
  });

  return (
    <div className="view-frame">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5 text-sm">
          <p className="min-w-0 text-ink2">
            Every change recorded about {accountLabel(account)}, newest first.
          </p>
          <Link className="link" to={auditAccountPath(account.id)}>
            Open in the audit log
          </Link>
        </div>
        <ActivityTable
          rows={rows}
          state={audit.isLoading || !grants.ready ? 'loading' : audit.isError ? 'error' : 'ready'}
          error={audit.error}
          onRetry={() => void audit.refetch()}
          empty={
            <EmptyState icon="history" title="Nothing recorded about this account yet">
              Changes to this account’s details, sign-in, keys and status are written here.
            </EmptyState>
          }
        />
      </div>
      <FooterPager
        page={page}
        pageSize={size}
        total={total ?? 0}
        onPage={setPage}
        onPageSize={(next) => {
          setSize(next);
          setPage(1);
        }}
      />
    </div>
  );
}
