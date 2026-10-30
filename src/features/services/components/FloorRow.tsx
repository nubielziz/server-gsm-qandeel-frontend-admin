// FloorRow: the last step of the resolution, the floor check: whether the price was raised to the floor, with the cost and the minimum
// profit the floor is made of. Ports `floorRow` in resolverTab (43-p-services.js). The floor and the prices are the server's.
import { Badge } from '@/components/ui';
import { money } from '@/lib/format';
import type { PriceResolution } from '../types';

/** The last numbered row: the floor check. */
export function FloorRow({ resolution, number }: { resolution: PriceResolution; number: number }) {
  return (
    <li className="flex items-start gap-3 px-3.5 py-2.5">
      <span className="mono mt-0.5 w-4 flex-none text-ink3">{number}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-sm font-medium">Floor check</span>
          {resolution.clamped ? (
            <Badge tone="warn" icon="alert">
              Raised to floor
            </Badge>
          ) : (
            <Badge tone="good" icon="check">
              Above floor
            </Badge>
          )}
        </div>
        <p className="text-xs text-ink3">
          Cost {money(resolution.cost)} plus minimum profit {money(resolution.minProfit)} ={' '}
          {money(resolution.floor)}. The price can never go lower.
        </p>
      </div>
      <div className="text-end tabular-nums">
        <p className="text-sm font-medium">{money(resolution.floor)}</p>
        {resolution.clamped && (
          <p className="text-xs text-ink3">
            {money(resolution.rawPrice)} → {money(resolution.price)}
          </p>
        )}
      </div>
    </li>
  );
}
