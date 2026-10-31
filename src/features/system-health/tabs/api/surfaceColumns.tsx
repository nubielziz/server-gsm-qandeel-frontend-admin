// surfaceColumns: the columns of the surfaces table of the API tab (and, on a phone, the lines of each card).
import { Sparkline } from '@/components/charts';
import { cx, Icon, type DataTableColumn, type HideBelow } from '@/components/ui';
import { HealthBadge } from '../../components';
import { RANGE_LABEL } from '../../lib';
import type { Measure, SurfaceMetrics, TimeRange } from '../../types';
import { Figure } from './Figure';
import { hasValues, p95Trend, surfaceState } from './surfaces';

export interface SurfaceColumnOptions {
  /** The surface the tab is focused on, if any. */
  picked: string | undefined;
  onPick: (surface: string) => void;
  range: TimeRange;
}

// One column per measure, right-aligned with tabular numerals. A measure the server left out reads "No data".
function measureColumn(
  key: string,
  label: string,
  pick: (surface: SurfaceMetrics) => Measure | undefined,
  hide?: HideBelow,
): DataTableColumn<SurfaceMetrics> {
  return { key, label, num: true, hide, render: (surface) => <Figure measure={pick(surface)} /> };
}

/**
 * Name first (it becomes the heading of a card on a phone), then the badge, the figures and the trend. p50, 429 and the
 * trend are the first to go on a narrow screen, so the rest of the table never needs a sideways scroll.
 */
export function surfaceColumns({
  picked,
  onPick,
  range,
}: SurfaceColumnOptions): DataTableColumn<SurfaceMetrics>[] {
  return [
    {
      key: 'surface',
      label: 'Surface',
      render: (surface) => {
        const isPicked = surface.surface === picked;
        return (
          <div className="min-w-0">
            {/* A real button: choosing a surface must work from the keyboard, not only by clicking the row. */}
            <button
              type="button"
              className={cx(
                'link inline-flex items-center gap-1 text-start',
                isPicked ? 'font-semibold' : 'font-medium',
              )}
              aria-current={isPicked ? 'true' : undefined}
              onClick={() => onPick(surface.surface)}
            >
              {isPicked && <Icon name="check" className="ic-xs" />}
              {surface.label || surface.surface}
            </button>
            <div className="mono text-ink3">{surface.surface}</div>
          </div>
        );
      },
    },
    {
      key: 'state',
      label: 'Status',
      render: (surface) => {
        const state = surfaceState(surface);
        return <HealthBadge status={state} label={state === 'unknown' ? 'No data' : undefined} />;
      },
    },
    measureColumn('requests', 'Requests', (surface) => surface.requestsPerMin),
    measureColumn('p50', 'p50', (surface) => surface.p50, 'xl'),
    measureColumn('p95', 'p95', (surface) => surface.p95),
    measureColumn('p99', 'p99', (surface) => surface.p99),
    measureColumn('rate4xx', '4xx rate', (surface) => surface.rate4xx),
    measureColumn('rate5xx', '5xx rate', (surface) => surface.rate5xx),
    measureColumn('count429', '429 count', (surface) => surface.count429, 'xl'),
    {
      key: 'trend',
      label: 'p95 trend',
      num: true,
      hide: 'xl',
      render: (surface) => {
        const values = p95Trend(surface);
        return hasValues(values) ? (
          // `align-middle`: a value that is only an SVG has its baseline at its bottom edge, so in a phone card the label
          // would line up with the bottom of the line and the line would read as an underline of the row above.
          <span className="inline-flex align-middle" title={`p95, ${RANGE_LABEL[range].toLowerCase()}`}>
            {/* From zero, so a calm line stays flat instead of filling the height. */}
            <Sparkline values={values} width={88} height={20} min={0} />
          </span>
        ) : (
          <span className="text-ink3">No data</span>
        );
      },
    },
  ];
}
