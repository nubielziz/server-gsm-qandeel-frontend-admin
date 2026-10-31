// ApiTab: the API tab of the System health page: traffic per surface, latency and 5xx charts, the slowest endpoints and the
// top errors. It reads `/admin/system/metrics` and `/admin/system/errors` and only composes the five cards.
import { useCallback, type ReactNode } from 'react';
import { PartBoundary } from '../../header/PartBoundary';
import { useApiErrors, useApiMetrics, useHealthRange } from '../../hooks';
import { ErrorRateCard } from './ErrorRateCard';
import { LatencyCard } from './LatencyCard';
import { SlowestCard } from './SlowestCard';
import { SurfacesCard } from './SurfacesCard';
import { TopErrorsCard } from './TopErrorsCard';
import { scopeName } from './surfaces';
import { useSurface } from './useSurface';

interface SlotProps {
  /** What the part is, for the note shown if it cannot be drawn ("The latency chart"). */
  name: string;
  /** The time of the part's latest answer: when it changes, a part that failed to draw is tried again. */
  resetKey: number;
  /** Grid placement of the part. */
  className: string;
  children: ReactNode;
}

// A grid cell with its own boundary, so a card that cannot draw an odd answer shows a note in its place and the rest stay.
// The cell keeps the placement, so the note does not shrink to one column.
function Slot({ name, resetKey, className, children }: SlotProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <PartBoundary name={name} resetKey={resetKey}>
        {children}
      </PartBoundary>
    </div>
  );
}

/**
 * Three reads feed five cards. The surfaces table always reads every surface, so any of them can still be chosen. The
 * charts and the slowest endpoints read the picked surface (`?surface=`), and so do the top errors. Without a picked
 * surface the first two reads are the same query. The range comes from the page header.
 */
export function ApiTab() {
  const [range] = useHealthRange();
  const [surface, setSurface] = useSurface();
  const everySurface = useApiMetrics({ range });
  const focused = useApiMetrics({ range, surface });
  const errors = useApiErrors({ range, surface });
  const scope = scopeName(everySurface.data, surface);
  const clear = useCallback(() => setSurface(undefined), [setSurface]);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* The cards below the table change when a surface is picked; say so for screen readers. */}
      <div className="sr-only" aria-live="polite">
        {surface ? `Showing ${scope}` : 'Showing all surfaces'}
      </div>
      <Slot name="The surfaces table" resetKey={everySurface.dataUpdatedAt} className="col-span-12">
        <SurfacesCard
          query={everySurface}
          range={range}
          surface={surface}
          onPick={setSurface}
          onClear={clear}
        />
      </Slot>
      <Slot name="The latency chart" resetKey={focused.dataUpdatedAt} className="col-span-12 xl:col-span-6">
        <LatencyCard query={focused} range={range} surface={surface} scope={scope} />
      </Slot>
      <Slot name="The 5xx chart" resetKey={focused.dataUpdatedAt} className="col-span-12 xl:col-span-6">
        <ErrorRateCard query={focused} range={range} surface={surface} scope={scope} />
      </Slot>
      <Slot name="The slowest endpoints" resetKey={focused.dataUpdatedAt} className="col-span-12">
        <SlowestCard query={focused} range={range} surface={surface} scope={scope} />
      </Slot>
      <Slot name="The top errors" resetKey={errors.dataUpdatedAt} className="col-span-12">
        <TopErrorsCard query={errors} range={range} surface={surface} scope={scope} />
      </Slot>
    </div>
  );
}
