// SelectionBar: the strip above the services table when rows are ticked: how many, then "Bulk price change…" for them and Clear.
// The demo had no row selection; the map's bulk price change can target "selected services", so the table gets tick boxes.
import { Button, Icon } from '@/components/ui';
import type { ServiceGrants } from '../hooks/useServiceGrants';

export interface SelectionBarProps {
  count: number;
  grants: ServiceGrants;
  onBulk: () => void;
  onClear: () => void;
}

/** Shown only while some services are ticked. */
export function SelectionBar({ count, grants, onBulk, onClear }: SelectionBarProps) {
  if (count === 0) return null;
  const lock = grants.needs('pricing:update');
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-3.5 py-2"
      role="region"
      aria-label="Selected services"
    >
      <span className="text-sm font-medium text-accent-ink">{count} selected</span>
      <span className="flex-1" />
      <Button size="sm" disabled={lock.disabled} title={lock.title} onClick={onBulk}>
        <Icon name="percent" className="ic-sm" />
        Change their prices…
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
