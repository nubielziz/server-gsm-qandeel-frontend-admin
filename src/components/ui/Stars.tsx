// Stars: a read-only 5-star rating. Ports stars(n) of 13-b2c-ui.js.
import { Icon } from './Icon';

export function Stars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-px text-warn-fg"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name="star"
          className="ic-xs"
          // Filled stars are solid; the rest stay as faint shapes so the scale is still readable.
          style={{ fill: 'currentColor', opacity: star <= value ? undefined : 0.22 }}
        />
      ))}
    </span>
  );
}
