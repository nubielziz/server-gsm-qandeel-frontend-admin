// BulkPriceLines: the preview of a bulk price change: each service with its price now, its price after the change and a warning
// when the new price falls under the floor. Every figure and every warning is the server's answer; nothing is priced here.
import { Badge, DataTable, type DataTableColumn } from '@/components/ui';
import { money } from '@/lib/format';
import type { BulkPriceLine } from '../types';

const COLUMNS: DataTableColumn<BulkPriceLine>[] = [
  {
    key: 'service',
    label: 'Service',
    render: (line) => (
      <>
        <span className="block max-w-[260px] truncate font-medium">{line.name}</span>
        <span className="mono text-xs text-ink3">{line.code}</span>
      </>
    ),
  },
  { key: 'old', label: 'Now', num: true, render: (line) => money(line.oldPrice) },
  {
    key: 'new',
    label: 'After',
    num: true,
    render: (line) => <span className="font-medium">{money(line.newPrice)}</span>,
  },
  {
    key: 'floor',
    label: 'Floor',
    render: (line) =>
      line.belowFloor ? (
        <Badge tone="warn" icon="alert">
          Under {money(line.floorPrice)}
        </Badge>
      ) : (
        <span className="text-ink3">{money(line.floorPrice)}</span>
      ),
  },
];

/** The preview table, scrollable when there are many services. */
export function BulkPriceLines({ lines }: { lines: readonly BulkPriceLine[] }) {
  return (
    <div className="max-h-[300px] overflow-auto rounded-md border border-line">
      <DataTable caption="Price changes" columns={COLUMNS} rows={lines} rowKey={(line) => line.serviceId} />
    </div>
  );
}
