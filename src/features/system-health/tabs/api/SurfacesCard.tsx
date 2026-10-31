// SurfacesCard: the first card of the API tab: one row per API surface with traffic, latency, error rates, the server's
// badge and a p95 trend. Choosing a surface focuses the cards below it (`?surface=`).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon, SkeletonTable } from '@/components/ui';
import { HealthCard, ResponsiveTable, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import { RANGE_LABEL, useCompactScreen } from '../../lib';
import type { ApiMetrics, TimeRange } from '../../types';
import { QuietSurfaces } from './QuietSurfaces';
import { surfaceColumns } from './surfaceColumns';
import { orderSurfaces, viewSurfaces } from './surfaces';

export interface SurfacesCardProps {
  /** The metrics of every surface (not narrowed by `?surface=`, so any surface can still be chosen). */
  query: HealthQuery<ApiMetrics>;
  range: TimeRange;
  surface: string | undefined;
  onPick: (surface: string) => void;
  /** "All surfaces": drops `?surface=`. */
  onClear: () => void;
}

/**
 * Worst surface first, with the healthy ones folded into a quiet line while something else needs attention (on a phone
 * also when nothing does). The header holds "All surfaces" while one is picked; the Grafana link is the page header's.
 */
export function SurfacesCard({ query, range, surface, onPick, onClear }: SurfacesCardProps) {
  const [expanded, setExpanded] = useState(false);
  // The same query ResponsiveTable asks, so the rows folded here and the layout (table or cards) always agree.
  const compact = useCompactScreen();
  const tableRef = useRef<HTMLDivElement>(null);
  const quietToggle = useRef<HTMLButtonElement>(null);
  const focusedBeforeClear = useRef<HTMLElement | null>(null);
  const columns = useMemo(() => surfaceColumns({ picked: surface, onPick, range }), [surface, onPick, range]);

  // The button just used is about to go away. Keep the keyboard on the surface that was picked, not at the top of the page.
  function clear() {
    const button = tableRef.current?.querySelector<HTMLElement>('[aria-current="true"]') ?? null;
    button?.focus();
    focusedBeforeClear.current = button;
    onClear();
  }

  // The surface was only in view because it was picked. If it is fine and another one is not, it now folds into the quiet
  // line and its button is gone: the keyboard goes to that line's Show button, which took its place.
  useEffect(() => {
    const button = focusedBeforeClear.current;
    if (surface !== undefined || !button) return;
    focusedBeforeClear.current = null;
    if (!button.isConnected) quietToggle.current?.focus();
  }, [surface]);

  return (
    <HealthCard
      title="Surfaces"
      sub={`Current figures, with the p95 trend of the ${RANGE_LABEL[range].toLowerCase()}. Select a surface to focus the charts and lists.`}
      right={
        surface && (
          <Button size="sm" onClick={clear}>
            <Icon name="x" className="ic-sm" />
            All surfaces
          </Button>
        )
      }
      query={query}
      interval={POLL.normal}
      skeleton={<SkeletonTable cols={6} rows={6} />}
      isEmpty={(data) => data.surfaces.length === 0}
      emptyText="Surfaces appear here once the API has served traffic in this range."
      errorTitle="Could not load the API surfaces"
      permission="system:read"
      flush
    >
      {(data) => {
        const view = viewSurfaces(orderSurfaces(data.surfaces), surface, expanded, compact);
        return (
          <div ref={tableRef}>
            {/* No table at all when every surface is folded (a phone with nothing to report): the quiet line stands alone. */}
            {view.rows.length > 0 && (
              <ResponsiveTable
                columns={columns}
                rows={view.rows}
                rowKey={(row) => row.surface}
                onRowClick={(row) => onPick(row.surface)}
                caption="API surfaces"
                footer={false}
              />
            )}
            {view.quiet > 0 && (
              <QuietSurfaces
                count={view.quiet}
                expanded={expanded}
                onToggle={() => setExpanded((open) => !open)}
                toggleRef={quietToggle}
              />
            )}
          </div>
        );
      }}
    </HealthCard>
  );
}
