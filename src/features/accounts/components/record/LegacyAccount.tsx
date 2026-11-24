// LegacyAccount: the resolver of an old record number. `/accounts/<n>?from=customer|merchant|client[&tab=<part>]` is the
// address the shell's redirect of `/customers/:id` and the audit rows and order events write (`legacyAccountPath`). The page shows only a
// loader and never reads `/admin/clients/<n>` (account <n> may be someone else); it asks the server which account the old record became
// and replaces the history entry with that account's own address. A record that is gone is told in words.
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ButtonLink, EmptyState, ErrorState, Icon } from '@/components/ui';
import type { Id } from '@/lib/api';
import { isApiError } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { findLegacyAccount } from '../../api';
import { accountPath, type AccountTab } from '../../lib/paths';
import type { LegacyAccountType } from '../../types';
import { lastListLink } from '../frame/lastListAddress';

export interface LegacyAccountProps {
  /** The old number the address holds. */
  id: Id;
  type: LegacyAccountType;
  /** The part to open on the account it became. */
  tab: AccountTab | null;
  /** An order to open in the drawer of the Orders part. */
  order?: Id;
}

/** The loader, then the move to the account's own address; or the words for a record that is gone. */
export function LegacyAccount({ id, type, tab, order }: LegacyAccountProps) {
  const navigate = useNavigate();
  const lookup = useApiQuery({
    queryKey: ['api', 'accounts', 'legacy', type, id],
    queryFn: ({ signal }) => findLegacyAccount(type, id, { signal }),
  });
  const accountId = lookup.data?.accountId;

  useEffect(() => {
    if (accountId !== undefined) {
      void navigate(accountPath(accountId, tab ?? undefined, order !== undefined ? { order } : {}), {
        replace: true,
      });
    }
  }, [accountId, tab, order, navigate]);

  if (lookup.isError) {
    if (isApiError(lookup.error) && lookup.error.status === 404) {
      const noun = type === 'customer' ? 'customer' : 'merchant';
      return (
        <EmptyState
          icon="user"
          title={`This ${noun} record moved or no longer exists`}
          cta={<ButtonLink to={lastListLink()}>Back to All</ButtonLink>}
        >
          The old number {id} does not name an account any more.
        </EmptyState>
      );
    }
    return (
      <ErrorState
        title="Could not find the account"
        error={lookup.error}
        onRetry={() => void lookup.refetch()}
      />
    );
  }
  return (
    <p role="status" className="flex items-center gap-2 py-6 text-sm text-ink2">
      <Icon name="loader" className="ic-sm animate-spin" />
      Finding the account…
    </p>
  );
}
