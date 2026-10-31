// UsageMeter: the headline of a store card, "38 of 100 used · 38 %" over a bar (connections for Postgres, memory for Redis).
import { Meter } from '@/components/ui';
import { HealthBadge } from '../../components';
import { formatMeasure } from '../../lib';
import type { Measure } from '../../types';
import { meterTone } from './storeFigures';

export interface UsageMeterProps {
  /** What is measured ("Connections", "Memory"). */
  label: string;
  /** What is used, already formatted ("38", "412 MB"). */
  used: string;
  /** The limit, already formatted ("100", "2 GB"), or null when there is none. */
  limit: string | null;
  /** How full the bar is, 0 to 1. */
  ratio: number;
  /** The server's reading of the usage in percent, with its state. */
  usage: Measure;
}

/**
 * The bar takes its colour from the server's state of `usage` (see `meterTone`), never from the numbers. A reading that is
 * off adds a badge with icon and word; a fine one adds nothing (the card's own badge says OK). With no limit there is
 * nothing to fill, so the bar is left out. When there is a limit but the server has no reading of the usage, the counts
 * beside it cannot be trusted either (a store that is down may send zeros), so the card says "No data" and nothing else.
 */
export function UsageMeter({ label, used, limit, ratio, usage }: UsageMeterProps) {
  const noLimit = limit === null;
  if (!noLimit && usage.value === null) {
    return (
      <div>
        <p className="m-0 text-xs text-ink3">{label}</p>
        <p className="m-0 mt-0.5 text-base font-medium text-ink3">{formatMeasure(usage)}</p>
      </div>
    );
  }
  const off = usage.value !== null && usage.state !== 'ok';
  // Without a limit a percentage is not expected: say so instead of "No data".
  const percent = noLimit && usage.value === null ? 'No limit set' : formatMeasure(usage);
  return (
    <div>
      <p className="m-0 text-xs text-ink3">{label}</p>
      <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
        <span className="text-base font-semibold">
          {noLimit ? `${used} used` : `${used} of ${limit} used`}
        </span>
        <span aria-hidden="true" className="text-ink3">
          ·
        </span>
        <span className={usage.value === null ? 'text-sm text-ink3' : 'text-sm text-ink2'}>{percent}</span>
        {off && <HealthBadge status={usage.state} />}
      </p>
      {!noLimit && <Meter ratio={ratio} tone={meterTone(usage.state)} className="mt-2" />}
    </div>
  );
}
