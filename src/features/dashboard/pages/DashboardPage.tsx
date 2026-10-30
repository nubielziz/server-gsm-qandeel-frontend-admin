// DashboardPage: the console's start page (`/dashboard`, the demo's `pageDashboard` in 40-p-dashboard.js). The work queue first,
// a slim scoreboard, then trends. Channel, period and chart controls live in the address (`?scope=b2c&days=14&range=12M&view=table`).
// The page only composes: the server counts, ranks and decides what needs attention.
import { Button, cx, ErrorState, errorText, Panel } from '@/components/ui';
import { DashboardBody } from '../components/DashboardBody';
import { DashboardHeader } from '../components/DashboardHeader';
import { useDashboard } from '../hooks/useDashboard';
import { useDashboardGrants } from '../hooks/useDashboardGrants';
import { useDashboardView } from '../hooks/useDashboardView';

/** Reads the view from the address, loads the dashboard for it and shows the body, a dimmed old answer while a new one loads, or the error. */
export function DashboardPage() {
  const view = useDashboardView();
  const grants = useDashboardGrants();
  const query = useDashboard({ scope: view.scope, days: view.days });
  // The answer for the last channel or period stays on screen, dimmed, until the new one arrives.
  const stale = query.isPlaceholderData;

  return (
    <>
      <DashboardHeader scope={view.scope} days={view.days} onScope={view.setScope} onDays={view.setDays} />
      {query.isError && !query.data ? (
        <Panel flush>
          <ErrorState
            title="Could not load the dashboard"
            detail={errorText(query.error)}
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </Panel>
      ) : (
        <div className={cx('transition-opacity', stale && 'opacity-[.45]')} aria-busy={stale || undefined}>
          {/* A failed background refresh keeps the last good board and says so, instead of replacing it. */}
          {query.isError && (
            <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-crit-fg" role="status">
              Could not refresh the dashboard: {errorText(query.error)}
              <Button size="sm" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </p>
          )}
          <DashboardBody
            placeholder={stale}
            data={query.data}
            scope={view.scope}
            days={view.days}
            range={view.range}
            chartView={view.chartView}
            onRange={view.setRange}
            onChartView={view.setChartView}
            canSeeReports={grants.reports}
          />
        </div>
      )}
    </>
  );
}
