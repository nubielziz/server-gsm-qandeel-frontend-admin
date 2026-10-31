// HistoryCell: the uptime bars of one component in the Overview tab's list (the "check history" column). It has a place
// for every state of the history read, so one failing read never leaves a row blank or green.
import { Skeleton } from '@/components/ui';
import { UptimeBars } from '../../components';
import { RANGE_LABEL } from '../../lib';
import type { HealthComponent } from '../../types';
import type { HistoryView } from './history';

export interface HistoryCellProps {
  component: HealthComponent;
  history: HistoryView;
}

// 10rem is the least the bars need; wider screens have the room for more.
const BARS_WIDTH = 'w-40 2xl:w-56';

/**
 * Bars while the history is there, a grey bar while it loads, and a neutral "No data" when it failed or has nothing for
 * this component (the notice above the list says why). Bars of the previous range stay, dimmed, while a new range loads.
 */
export function HistoryCell({ component, history }: HistoryCellProps) {
  if (history.status === 'loading') return <Skeleton width={160} height={24} />;
  const buckets = history.buckets.get(component.key);
  if (history.status === 'failed' || !buckets) return <span className="text-xs text-ink3">No data</span>;
  const range = history.range ? RANGE_LABEL[history.range].toLowerCase() : 'history';
  return (
    <div
      className={history.placeholder ? 'opacity-60' : undefined}
      aria-busy={history.placeholder || undefined}
    >
      <UptimeBars
        buckets={buckets}
        bucketSeconds={history.bucketSeconds}
        label={`${component.name} checks, ${range}`}
        className={BARS_WIDTH}
      />
    </div>
  );
}
