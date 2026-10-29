// Meter: the 6px pill track from DESIGN.md ("SLA meter"). Ports the .meter bar of slaCell() in 41-p-orders.js.
import { cx } from './cx';

export type MeterTone = 'neutral' | 'warn' | 'serious' | 'crit';

export interface MeterProps {
  /** Progress from 0 to 1 (values above 1 are drawn full). */
  ratio: number;
  /** Colour override. By default: neutral, warn from `warnAt`, critical from 1. */
  tone?: MeterTone;
  /** Where the bar turns warn. DESIGN.md: 70% of the SLA. */
  warnAt?: number;
  /** Width and spacing, for example `mt-1 w-14`. Without a width it fills its container. */
  className?: string;
  /** Names the meter for assistive tech. Leave out when the number is written next to it. */
  label?: string;
}

const FILL_CLASS: Record<MeterTone, string> = {
  neutral: 'bg-neutral-dot',
  warn: 'bg-warn-dot',
  serious: 'bg-serious-dot',
  crit: 'bg-crit-dot',
};

/**
 * Once an order is late the page drops the bar and writes "Late by 8m" instead: a full red bar on every late
 * row adds nothing (DESIGN.md), so this component does not decide that for the page.
 */
export function Meter({ ratio, tone, warnAt = 0.7, className, label }: MeterProps) {
  const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  const shown = tone ?? (ratio >= 1 ? 'crit' : ratio >= warnAt ? 'warn' : 'neutral');
  return (
    <div
      className={cx('meter', className)}
      role={label ? 'meter' : 'presentation'}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(clamped * 100) : undefined}
    >
      <i className={FILL_CLASS[shown]} style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}
