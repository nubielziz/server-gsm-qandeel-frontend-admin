// The verification (KYC) requests: the list for the Verification tab, one request for the drawer, which request is open (kept
// in the address as `?kyc=<id>`), and the decision. A screen the demo lacks (MISMATCHES M47).
import { useList, useOne } from '@refinedev/core';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useApiMutation } from '@/lib/query';
import { decideKycSubmission } from '../api';
import type { KycFilter } from '../lib/filters';
import type { KycDecisionBody, KycListFilters, KycSubmission } from '../types';
import { CLIENT_STALE_KEYS, REFRESH_MS } from './keys';

/** What the request list needs: the status filter, the page and the page size. */
export type KycListArgs = { filter: KycFilter; page: number; pageSize: number; enabled?: boolean };

/** One page of requests of the chosen status, newest first. Pending requests are the work to do, so they also refresh by themselves. */
export function useKycList({ filter, page, pageSize, enabled = true }: KycListArgs) {
  const filters: KycListFilters = filter === 'all' ? {} : { status: filter };
  const { result, query } = useList<KycSubmission>({
    resource: 'kyc-submissions',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    filters: Object.entries(filters).map(([field, value]) => ({ field, operator: 'eq' as const, value })),
    queryOptions: { enabled, refetchInterval: REFRESH_MS },
    errorNotification: false,
  });
  return { submissions: result.data, total: result.total, query };
}

/** One request for the drawer. The list row shows at once; the single read replaces it with the fresher answer. */
export function useKycSubmission(id: number, row?: KycSubmission) {
  const { result, query } = useOne<KycSubmission>({
    resource: 'kyc-submissions',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    errorNotification: false,
  });
  return { submission: result ?? row, query };
}

/** Which request's drawer is open, kept in the address so a link opens it. Opening adds a history entry, so Back closes it. */
export function useKycDrawer() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('kyc');
  const id = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  const open = useCallback(
    (kycId: number) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('kyc', String(kycId));
        return next;
      }),
    [setParams],
  );
  const close = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('kyc');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { id, open, close };
}

/** Approves or rejects a request. A decision can change the merchant's verification status and the pending count. */
export function useDecideKyc() {
  return useApiMutation({
    mutationFn: ({ submission, body }: { submission: KycSubmission; body: KycDecisionBody }) =>
      decideKycSubmission(submission.id, body),
    invalidates: (_result, { submission }) => [
      { resource: 'kyc-submissions', id: submission.id },
      { resource: 'clients', id: submission.clientId },
    ],
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (_result, { submission, body }) =>
      body.decision === 'approve'
        ? { message: `${submission.client.name} verified`, description: 'Their verification is approved.' }
        : { message: `Verification of ${submission.client.name} rejected`, description: body.note },
    errorNotification: () => false as const,
  });
}
