// MoneyPage: "Money", the one page of the ledger, deposits, invoices, reports, refunds and card disputes (decision 026), in the layout of the
// Accounts page: a strip of tabs, then a row of text links, one per view; each link is a full view with its own address. The page only
// composes: the registry says which component draws each view, each view owns its data, and the server computes every figure.
import { Fragment, use, useMemo } from 'react';
import { EmptyState, PageHeader, SkeletonTable } from '@/components/ui';
import { useMe } from '@/features/auth';
import { useTabEnter } from '@/lib/motion';
import { MoneyNav } from '../components/frame/MoneyNav';
import { renderMoneyView } from '../components/frame/moneyViewRegistry';
import { useMoneyAddress } from '../components/frame/useMoneyAddress';
import { MONEY_HEADING, usableViews, viewSpec } from '../lib/moneyViews';
import { loadMoneyModules } from '../lib/modules';

/** The page: the view the address names, or the first view the role may use. */
export function MoneyPage() {
  const { data: me } = useMe();
  const usable = useMemo(() => (me ? usableViews(me.permissions) : undefined), [me]);
  const { view } = useMoneyAddress(usable);
  // The view fades in from the side of the tab or link that was clicked (the order of the registry is the order on screen). A hook, so it
  // comes before the early returns below.
  const viewBox = useTabEnter(
    view ?? '',
    (usable ?? []).map((spec) => spec.id),
  );

  if (view === null) {
    return (
      <>
        <PageHeader title={MONEY_HEADING} />
        <EmptyState icon="lock" title="Nothing here for your role">
          Your role cannot see the ledger, deposits, invoices, reports, refunds or card disputes. Ask an owner
          if you need access.
        </EmptyState>
      </>
    );
  }
  if (!usable || !view) {
    return (
      <>
        <PageHeader title={MONEY_HEADING} />
        <SkeletonTable cols={6} rows={6} />
      </>
    );
  }
  // The two view modules load once, on the first visit; until then the route's Suspense shows the page's loading state.
  const modules = use(loadMoneyModules());
  return (
    <div className="page-frame">
      <PageHeader title={MONEY_HEADING} />
      <MoneyNav usable={usable} view={view} modules={modules} />
      {/* The one gap between the row of links and every view: a view draws no top margin of its own. */}
      <section ref={viewBox} aria-label={viewSpec(view).label} className="mt-3 flex flex-1 flex-col">
        {/* A new view starts with fresh state; what a view keeps (page, filters) lives in the address. */}
        <Fragment key={view}>{renderMoneyView(view, { modules, usable })}</Fragment>
      </section>
    </div>
  );
}
