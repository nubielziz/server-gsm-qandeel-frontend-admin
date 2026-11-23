// FilterChip: an active filter of the Catalog toolbar that came from an address ("Below floor" from the header's sentence or the
// dashboard, "On the shop" from a finished publish run). It is drawn ink-black so it cannot be missed, and pressing it removes it, so an
// old link never filters out of sight. Ports the look of the `chip` of servicesTab in 43-p-services.js.
import { Icon, type IconName } from '@/components/ui';

export interface FilterChipProps {
  /** The filter's name, as the chip shows it. */
  label: string;
  icon: IconName;
  onRemove: () => void;
}

/** A pressed chip with a remove mark; its accessible name says what pressing it does. */
export function FilterChip({ label, icon, onRemove }: FilterChipProps) {
  return (
    <button
      type="button"
      className="chip !h-8 !border-ink !bg-ink !px-2.5 font-sans !text-sm !text-surface"
      aria-label={`Remove the filter ${label}`}
      title="Remove this filter"
      onClick={onRemove}
    >
      <Icon name={icon} className="ic-sm" />
      {label}
      <Icon name="x" className="ic-xs" />
    </button>
  );
}
