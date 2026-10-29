// PastSlaChip: the "Past SLA" toggle of the toolbar. Ports the `flag-sla` chip of pageOrders (41-p-orders.js): off it is a
// quiet chip, on it turns critical so the filter cannot be missed.
import { cx, Icon } from '@/components/ui';

export interface PastSlaChipProps {
  active: boolean;
  onToggle: () => void;
}

export function PastSlaChip({ active, onToggle }: PastSlaChipProps) {
  return (
    <button
      type="button"
      className={cx(
        'chip !h-8 !px-2.5 font-sans !text-sm',
        active ? '!border-crit-dot !bg-crit-bg !text-crit-fg' : 'hover:border-ink3',
      )}
      aria-pressed={active}
      onClick={onToggle}
    >
      <Icon name="clock" className="ic-sm" />
      Past SLA
    </button>
  );
}
