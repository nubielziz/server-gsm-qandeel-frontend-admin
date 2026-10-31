// SystemHealthHeader: the top of the System health page: the title, how fresh the data is and which build runs, the range
// switch, Refresh, Maintenance and the Grafana link (docs/system-health-design.md, "Layout").
import { Button, Icon, SegmentedControl } from '@/components/ui';
import { DeepLink } from '../components/DeepLink';
import { Freshness } from '../components/Freshness';
import { POLL, useHealthRange, useSystemHealth } from '../hooks';
import { RANGE_ITEMS } from '../lib';
import { MaintenanceControl } from './MaintenanceControl';
import { useRefreshAction } from './useRefreshAction';

export interface SystemHealthHeaderProps {
  /** The staff member holds `system:read`, so the health summary may be read (freshness, build, maintenance state). */
  canReadStatus: boolean;
}

/**
 * Title and controls on one row, the "Updated 8s ago · v1.42.0 · 9c4e1fa · production" line under it. On a phone the line
 * comes first and the controls wrap below. The range switch scopes the tabs only; the title text says so.
 */
export function SystemHealthHeader({ canReadStatus }: SystemHealthHeaderProps) {
  const health = useSystemHealth(canReadStatus);
  const [range, setRange] = useHealthRange();
  const refresh = useRefreshAction();
  const build = health.data?.build;

  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <h1 className="order-1 text-xl font-semibold tracking-tight">System health</h1>

      <div className="order-3 flex flex-wrap items-center gap-2 md:order-2">
        <span title="Time range of the charts and lists in the tabs. The key figures above always show now.">
          <SegmentedControl items={RANGE_ITEMS} value={range} onChange={setRange} label="Time range" />
        </span>
        {/* On a phone Refresh is an icon button, so the range, Refresh and Maintenance fit in one row. */}
        <Button
          className="max-sm:w-8 max-sm:px-0"
          aria-label="Refresh"
          title="Read every card again"
          onClick={() => void refresh.run()}
          loading={refresh.busy}
        >
          {!refresh.busy && <Icon name="refresh" className="ic-sm" />}
          <span className="max-sm:hidden">Refresh</span>
        </Button>
        <MaintenanceControl maintenance={health.data?.maintenance} />
      </div>

      <div className="order-2 flex basis-full flex-wrap items-center justify-between gap-x-4 gap-y-1 md:order-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink3">
          {canReadStatus && <Freshness updatedAt={health.dataUpdatedAt} interval={POLL.fast} showInterval />}
          {/* Each item carries the dot before it and never breaks inside, so a wrap never leaves a dot at a line end. */}
          {build && (
            <>
              <span className="whitespace-nowrap">
                <span aria-hidden="true">· </span>
                {build.version}
              </span>
              <span className="whitespace-nowrap">
                <span aria-hidden="true">· </span>
                <span className="mono" title="Commit">
                  {build.commit}
                </span>
              </span>
              <span className="whitespace-nowrap">
                <span aria-hidden="true">· </span>
                {build.environment}
              </span>
            </>
          )}
        </div>
        <DeepLink to="grafana" />
      </div>
    </header>
  );
}
