// AccountsPage: "Accounts", the one page of every merchant and shop buyer (decision 023), in the layout of the Product / Services page: a strip of
// tabs, one per population, then a row of text links, one per view (All, +Add Account, Ranks, +Add Rank, then Data requests); each link is
// a full view of the page. The page only composes: the registry (frame/accountsViews) says which views exist and who may use them, each
// view owns its data, and the server computes every figure. A role opens the first view it may use; without `clients:read` the accounts
// list is never mounted or read. The page is one frame as tall as the window: the heading and the two rows of links keep their height and
// the view fills what is left (index.css, .page-frame).
import { useSearchParams } from 'react-router';
import { EmptyState, PageHeader, SkeletonTable } from '@/components/ui';
import { useTabEnter } from '@/lib/motion';
import { AccountsNav } from '../components/frame/AccountsNav';
import { ACCOUNTS_HEADING } from '../components/frame/accountsPage';
import { ACCOUNTS_VIEW_SPECS, usableViews } from '../components/frame/accountsViews';
import { useAccountGrants } from '../components/frame/useAccountGrants';
import { useAccountsAddress } from '../components/frame/useAccountsAddress';
import { parseListAddress } from '../components/list/listAddress';

/** The page: the view the address names, or the first view the role may use. */
export function AccountsPage() {
  const grants = useAccountGrants();
  const usable = grants.ready ? usableViews(grants, ACCOUNTS_VIEW_SPECS) : undefined;
  const { view } = useAccountsAddress(usable);
  const [params] = useSearchParams();
  const spec = view ? usable?.find((candidate) => candidate.id === view) : undefined;
  const chip = parseListAddress(params).chip;
  // The view fades in from the side of the link that was clicked. A change of the strip's population inside the All view is the list's own
  // (AllView), because only it knows when the new rows are there. A hook, so it comes before the early returns below.
  const viewBox = useTabEnter(
    view ?? '',
    (usable ?? []).map((candidate) => candidate.id),
  );

  if (view === null) {
    return (
      <>
        <PageHeader title={ACCOUNTS_HEADING} />
        <EmptyState icon="lock" title="Nothing here for your role">
          Your role cannot see accounts or ranks. Ask an owner if you need access.
        </EmptyState>
      </>
    );
  }
  if (!usable || !view || !spec) {
    return (
      <>
        <PageHeader title={ACCOUNTS_HEADING} />
        <SkeletonTable cols={6} rows={6} />
      </>
    );
  }
  return (
    <div className="page-frame">
      <PageHeader title={ACCOUNTS_HEADING} />
      <AccountsNav grants={grants} usable={usable} view={view} chip={chip} />
      <section ref={viewBox} aria-label={spec.label} className="flex flex-1 flex-col">
        {/* A new view starts with fresh state; what a view keeps (page, filters) lives in the address. */}
        <spec.Component key={view} grants={grants} />
      </section>
    </div>
  );
}
