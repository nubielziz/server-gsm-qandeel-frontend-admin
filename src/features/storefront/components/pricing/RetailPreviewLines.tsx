// RetailPreviewLines: the services a rule change would move: each with its cost, its price now, its price after and the floor.
// Every figure is the server's answer; nothing is priced here. A price held at its floor carries a warning badge.
import { Badge, DataTable, type DataTableColumn } from '@/components/ui';
import { money } from '@/lib/format';
import type { RetailRulePreviewLine } from '../../types';

const COLUMNS: DataTableColumn<RetailRulePreviewLine>[] = [
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
  { key: 'cost', label: 'Cost', num: true, hide: 'sm', render: (line) => money(line.cost) },
  { key: 'now', label: 'Now', num: true, render: (line) => money(line.currentPrice) },
  {
    key: 'after',
    label: 'After',
    num: true,
    render: (line) =>
      line.newPrice === null ? (
        <span className="text-ink3">No rule</span>
      ) : (
        <span className="font-medium">{money(line.newPrice)}</span>
      ),
  },
  {
    key: 'floor',
    label: 'Floor',
    render: (line) =>
      line.atFloor ? (
        <Badge tone="warn" icon="alert">
          At {money(line.floorPrice)}
        </Badge>
      ) : (
        <span className="text-ink3">{money(line.floorPrice)}</span>
      ),
  },
];

/** The preview table, scrollable when there are many lines. */
export function RetailPreviewLines({ lines }: { lines: readonly RetailRulePreviewLine[] }) {
  return (
    <div className="max-h-[300px] overflow-auto rounded-md border border-line">
      <DataTable
        caption="Prices this change moves"
        columns={COLUMNS}
        rows={lines}
        rowKey={(line) => line.serviceId}
        footer={false}
      />
    </div>
  );
}
