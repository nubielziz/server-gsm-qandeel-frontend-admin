// ImportPreview: step 2 of "Import services…": what the server says each picked service would do: new, matching a service
// already imported, or with a changed cost, with the price it suggests for a new one. Changes nothing until Import is pressed.
import { Badge, TypeTag } from '@/components/ui';
import { money } from '@/lib/format';
import { countItems, IMPORT_BADGE, previewSummary } from '../lib/importPlan';
import type { ImportPreviewItem } from '../types';

/** Step 2: the server's answer for each picked service, with the price it suggests for a new one. */
export function ImportPreview({ items }: { items: readonly ImportPreviewItem[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink2" aria-live="polite">
        {previewSummary(countItems(items))}.
      </p>
      <div className="tbl-wrap max-h-[360px] rounded-md border border-line">
        <table className="tbl" aria-label="Import preview">
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">What happens</th>
              <th scope="col" className="num">
                Cost
              </th>
              <th scope="col" className="num">
                Suggested price
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const badge = IMPORT_BADGE[item.state];
              return (
                <tr key={item.supplierServiceId}>
                  <td>
                    <span className="font-medium">{item.name}</span>{' '}
                    <TypeTag>{item.type.toUpperCase()}</TypeTag>
                    {item.serviceName && item.serviceName !== item.name && (
                      <p className="text-2xs text-ink3">Linked to {item.serviceName}</p>
                    )}
                  </td>
                  <td>
                    <Badge tone={badge.tone} icon={badge.icon}>
                      {badge.label}
                    </Badge>
                  </td>
                  <td className="num">
                    {money(item.cost)}
                    {item.previousCost && (
                      <p className="text-2xs text-ink3">was {money(item.previousCost)}</p>
                    )}
                  </td>
                  <td className="num">{item.suggestedPrice ? money(item.suggestedPrice) : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
