// ResolverSummary: the right half of the resolver: what the merchant pays, the profit and margin, the price source, and (when the
// server sends it) what the same service costs the other groups. Ports the summary column of resolverTab in 43-p-services.js.
// Profit, margin and every price are the server's figures.
import { money, pct } from '@/lib/format';
import { SOURCE_WORDS } from '../lib/trace';
import type { PriceResolution } from '../types';

export interface ResolverSummaryProps {
  resolution: PriceResolution;
  merchantName: string;
  /** The merchant's own group, to mark its row in the other-groups table. */
  groupId?: number;
}

/** The price the merchant pays, its profit and source, and the other groups. */
export function ResolverSummary({ resolution, merchantName, groupId }: ResolverSummaryProps) {
  return (
    <div className="p-3.5">
      <p className="text-xs text-ink3">{merchantName} pays</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{money(resolution.price)}</p>
      <p className="mt-1 text-sm text-ink2">
        Profit <span className="font-medium tabular-nums">{money(resolution.margin)}</span> per order,{' '}
        {pct(resolution.marginPct, 1)} margin. Source:{' '}
        <strong className="font-medium">{SOURCE_WORDS[resolution.source]}</strong>.
      </p>
      {resolution.otherGroups && resolution.otherGroups.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-xs font-medium text-ink3">Same service, other groups</h3>
          <table className="w-full text-sm" aria-label="Same service, other groups">
            <tbody className="divide-y divide-line">
              {resolution.otherGroups.map(({ group, price, clamped }) => (
                <tr key={group.id}>
                  <td className={group.id === groupId ? 'py-1.5 font-medium' : 'py-1.5 text-ink2'}>
                    {group.name}
                    {group.id === groupId && <span className="text-xs text-ink3"> (this merchant)</span>}
                  </td>
                  <td className="py-1.5 text-end tabular-nums">
                    {money(price)}
                    {clamped && <span className="text-xs text-warn-fg"> floor</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink3">Group rows ignore this merchant’s personal override.</p>
        </>
      )}
    </div>
  );
}
