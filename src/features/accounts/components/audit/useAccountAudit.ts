// The audit entries about one account for the Activity Log part: the audit feature's list filtered by `accountId`, newest first, one page at
// a time. The server resolves the filter (the rows that say `account` or `merchant` with the number, and the old customer rows of the
// account's old number), so the part never guesses which rows are the account's.
import { listAuditLogs } from '@/features/audit';
import { useApiQuery } from '@/lib/query';

/** The key of the account's audit pages, under the accounts feature's own prefix. */
export const ACCOUNT_AUDIT_KEY = ['api', 'accounts', 'audit'] as const;

/** Rows of one page the part starts with; the footer offers the other sizes. */
export const ACTIVITY_PAGE_SIZE = 25;

/**
 * One page (1-based) of the entries about the account, with the total in `data.total`. The page before stays on screen while the next one
 * loads. Pass `enabled: false` while the grants are unknown.
 * @param accountId The account.
 * @param page 1-based page.
 * @param size Rows to a page.
 * @see GET /admin/audit-logs
 */
export function useAccountAudit(accountId: number, page: number, size: number, enabled = true) {
  return useApiQuery({
    queryKey: [...ACCOUNT_AUDIT_KEY, accountId, page, size],
    queryFn: ({ signal }) =>
      listAuditLogs(
        {
          start: (page - 1) * size,
          end: page * size,
          sort: ['createdAt'],
          order: ['desc'],
          filters: { accountId },
        },
        { signal },
      ),
    enabled,
    placeholderData: (previous) => previous,
  });
}
