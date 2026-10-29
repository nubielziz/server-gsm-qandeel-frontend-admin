// SegmentedControl: sunken track with a lifted selected segment, for periods and status filters. Ports segEl().
import { cx } from './cx';

export interface SegmentItem<V extends string | number = string> {
  value: V;
  label: string;
}

export interface SegmentedControlProps<V extends string | number = string> {
  items: readonly SegmentItem<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}

export function SegmentedControl<V extends string | number = string>({
  items,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<V>) {
  return (
    <div className={cx('seg', className)} role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          // Compared as text like the demo, so a numeric value matches its string form.
          aria-pressed={String(item.value) === String(value)}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
