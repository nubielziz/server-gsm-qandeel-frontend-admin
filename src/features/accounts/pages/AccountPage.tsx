// AccountPage: one account (`/accounts/:id`) in the layout of a record with many parts: the strip with the account's own tab
// raised, the row of views with All lit, a left menu of the parts and the part the address names on its right. The page reads the
// account and says what it shows while it cannot draw it: a loading skeleton, "This account does not exist", the server's refusal with
// Retry, or "Your role cannot read accounts". `/accounts/<n>?from=customer|merchant|client` is the old record number resolver
// (components/record/LegacyAccount): account <n> is never read on that road. The account's name is the breadcrumb and the tab title.
import type { ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useBreadcrumbTitle } from '@/app/layout/breadcrumbTitle';
import { ButtonLink, EmptyState, ErrorState, PageHeader, SkeletonTable, useDirtyMark } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { useAccount } from '../hooks/useAccount';
import { isAccountTab, type AccountTab } from '../lib/paths';
import type { LegacyAccountType } from '../types';
import { AccountsNav } from '../components/frame/AccountsNav';
import { ACCOUNTS_HEADING } from '../components/frame/accountsPage';
import { ACCOUNTS_VIEW_SPECS, usableViews } from '../components/frame/accountsViews';
import { lastListLink } from '../components/frame/lastListAddress';
import { useAccountGrants, type AccountGrants } from '../components/frame/useAccountGrants';
import { LegacyAccount } from '../components/record/LegacyAccount';
import { OpenAccount } from '../components/record/OpenAccount';
import { openPart } from '../components/record/openPart';
import { RecordLoading } from '../components/record/RecordLoading';
import { accountLabel } from '../components/shared/accountLabel';

// A positive whole number from an address, or undefined.
function recordNumber(raw: string | null | undefined): number | undefined {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : undefined;
}

const LEGACY_TYPES: readonly LegacyAccountType[] = ['customer', 'merchant', 'client'];

const missing = (id: string | undefined) => (
  <EmptyState
    icon="user"
    title="This account does not exist"
    cta={<ButtonLink to={lastListLink()}>Back to All</ButtonLink>}
  >
    {recordNumber(id) === undefined
      ? 'That address is not an account number.'
      : `There is no account #${id}. It may have been removed.`}
  </EmptyState>
);

// What a role that may open the page for the ranks only sees where an account would be: the accounts need clients:read, and the old
// record numbers (the resolver) need it too, like the record itself.
const locked = (
  <EmptyState icon="lock" title="Your role cannot read accounts">
    Ask an owner if you need to see one.
  </EmptyState>
);

// The page frame, the strip and the row of links: what every state of the record page draws.
function Frame({
  grants,
  record,
  children,
}: {
  grants: AccountGrants;
  record?: { id: number; label: string };
  children: ReactNode;
}) {
  const usable = usableViews(grants, ACCOUNTS_VIEW_SPECS);
  return (
    <div className="page-frame">
      <PageHeader title={ACCOUNTS_HEADING} />
      <AccountsNav grants={grants} usable={usable} view="all" chip={null} record={record} onRecord />
      <section aria-label={record ? record.label : 'Account'} className="flex flex-1 flex-col">
        {children}
      </section>
    </div>
  );
}

// One account read and drawn. The unsaved mark of the open part lives here, beside the read, so a part's report draws this component
// again and the record is taken afresh in that same draw (see usePartStart).
function RecordPage({ id, part, grants }: { id: number; part: AccountTab | null; grants: AccountGrants }) {
  // A role without clients:read never reaches this (the page answers first), and nothing is read for it.
  const { account, notFound, query } = useAccount(id);
  const label = account ? accountLabel(account) : undefined;
  useBreadcrumbTitle(label);
  const mark = useDirtyMark(account ? openPart(account, part, grants).scope : '');

  const record = account && label ? { id: account.id, label } : undefined;
  if (!account) {
    return (
      <Frame grants={grants}>
        {notFound ? (
          missing(String(id))
        ) : query.isError && !(isApiError(query.error) && query.error.status === 404) ? (
          <ErrorState
            title="Could not load this account"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <RecordLoading />
        )}
      </Frame>
    );
  }
  return (
    <Frame grants={grants} record={record}>
      <OpenAccount account={account} part={part} grants={grants} refreshing={query.isFetching} mark={mark} />
    </Frame>
  );
}

/** The record of the account the address names. */
export function AccountPage() {
  const { id: rawId } = useParams();
  const [params] = useSearchParams();
  const grants = useAccountGrants();
  const id = recordNumber(rawId);
  const from = LEGACY_TYPES.find((type) => type === params.get('from'));
  const tab = params.get('tab');
  const order = recordNumber(params.get('order'));
  // An address with an order and no part opens Orders (the order drawer's address); one that names a part opens it.
  const part: AccountTab | null = isAccountTab(tab) ? tab : order !== undefined && !tab ? 'orders' : null;

  if (id === undefined) {
    return grants.ready ? (
      <Frame grants={grants}>{missing(rawId)}</Frame>
    ) : (
      <>
        <PageHeader title={ACCOUNTS_HEADING} />
        <SkeletonTable cols={4} rows={6} />
      </>
    );
  }
  if (!grants.ready) {
    return (
      <>
        <PageHeader title={ACCOUNTS_HEADING} />
        <SkeletonTable cols={4} rows={6} />
      </>
    );
  }
  if (!grants.can('clients:read')) return <Frame grants={grants}>{locked}</Frame>;
  if (from) {
    return (
      <Frame grants={grants}>
        <LegacyAccount id={id} type={from} tab={isAccountTab(tab) ? tab : null} order={order} />
      </Frame>
    );
  }
  return <RecordPage key={id} id={id} part={part} grants={grants} />;
}
