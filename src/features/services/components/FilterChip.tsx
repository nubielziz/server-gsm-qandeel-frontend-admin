// FilterChip: a toggle chip of the table toolbar ("Below floor", "Disabled"). Ports the `chip` of servicesTab in 43-p-services.js:
// off it is a quiet chip, on it turns ink-black so the filter cannot be missed.
import { cx, Icon, type IconName } from '@/components/ui';
import type { ReactNode } from 'react';

export interface FilterChipProps {
  active: boolean;
  icon: IconName;
  onToggle: () => void;
  children: ReactNode;
}

/** A pressed-state toggle with an icon. */
export function FilterChip({ active, icon, onToggle, children }: FilterChipProps) {
  return (
    <button
      type="button"
      className={cx(
        'chip !h-8 !px-2.5 font-sans !text-sm',
        active ? '!border-ink !bg-ink !text-surface' : 'hover:border-ink3',
      )}
      aria-pressed={active}
      onClick={onToggle}
    >
      <Icon name={icon} className="ic-sm" />
      {children}
    </button>
  );
}
