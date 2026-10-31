// ComponentsCard: the first card of the Overview tab: every checked component, problems first, with the check history bars.
// It reads `GET /admin/system/health` (the list) and `GET /admin/system/checks` (the bars) on route group `health`.
import type { UseQueryResult } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { SkeletonTable } from '@/components/ui';
import type { ApiError } from '@/lib/api';
import { HealthCard } from '../../components';
import { POLL, useChecks, useHealthGrants, useHealthRange, useSystemHealth } from '../../hooks';
import { RANGE_LABEL } from '../../lib';
import type { ChecksResponse, HealthComponent, TimeRange } from '../../types';
import { groupComponents, listComponents } from './componentRows';
import { ComponentsTable } from './ComponentsTable';
import { HealthyLine } from './HealthyLine';
import { historyView } from './history';
import { HistoryNotice } from './HistoryNotice';
import type { PickedComponent } from './usePickedComponent';

interface BodyProps {
  components: readonly HealthComponent[];
  checks: UseQueryResult<ChecksResponse, ApiError>;
  range: TimeRange;
  picked: PickedComponent;
  canOpenSupplier: boolean;
}

/**
 * Down, degraded and unknown components are rows. The healthy ones wait behind "Show"; with every component fine the card
 * is that one line. The one the address named stays a row even when it is healthy. The choice lives in this card only (it
 * is not an address parameter).
 */
function ComponentsBody({ components, checks, range, picked, canOpenSupplier }: BodyProps) {
  const [showHealthy, setShowHealthy] = useState(false);
  const groups = useMemo(() => groupComponents(components), [components]);
  const { data, isError, isPlaceholderData } = checks;
  const history = useMemo(
    () => historyView({ data, isError, isPlaceholderData }),
    [data, isError, isPlaceholderData],
  );
  const pinned = picked.fromAddress ? picked.key : null;
  const { rows, line } = useMemo(
    () => listComponents(groups, showHealthy, pinned),
    [groups, showHealthy, pinned],
  );
  return (
    <>
      <HistoryNotice query={checks} />
      {rows.length > 0 && (
        <ComponentsTable
          rows={rows}
          history={history}
          range={range}
          picked={picked.key}
          onPick={picked.pick}
          canOpenSupplier={canOpenSupplier}
        />
      )}
      {line && (
        <HealthyLine
          count={line.count}
          others={line.others}
          open={showHealthy}
          onToggle={() => setShowHealthy((open) => !open)}
          divided={rows.length > 0}
        />
      )}
    </>
  );
}

export interface ComponentsCardProps {
  /** The component the chart shows and the function that changes it (`usePickedComponent`). */
  picked: PickedComponent;
}

/**
 * The card is a `HealthCard` around the health summary; the history is a second read inside it, so a failing history
 * leaves the rows (with a notice) and a failing summary shows the card's own error with Retry.
 */
export function ComponentsCard({ picked }: ComponentsCardProps) {
  const health = useSystemHealth();
  const [range] = useHealthRange();
  const checks = useChecks({ range });
  const grants = useHealthGrants();
  return (
    <HealthCard
      title="Components"
      sub={
        <>
          Check history: {RANGE_LABEL[range].toLowerCase()}.
          {/* The uptime columns hide between `md` and `xl` (see componentColumns), so the sentence about them does too. */}
          <span className="md:max-xl:hidden">
            {' '}
            Uptime is always over the last 24 hours, 7 days and 30 days.
          </span>
        </>
      }
      query={health}
      interval={POLL.fast}
      permission="system:read"
      errorTitle="Could not load the components"
      emptyText="Components appear here once the workers have checked them."
      isEmpty={(data) => data.components.length === 0}
      skeleton={<SkeletonTable cols={6} rows={4} />}
      flush
    >
      {(data) => (
        <ComponentsBody
          components={data.components}
          checks={checks}
          range={range}
          picked={picked}
          canOpenSupplier={grants.can('suppliers:read')}
        />
      )}
    </HealthCard>
  );
}
