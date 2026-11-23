// ImportPreviewTable: what the server says adding the picked services would do: which are new, which match a service of ours already, which
// have a new cost, the group a new one goes into and the price the server suggests for it. Changes nothing. The summary counts every item;
// the table draws the first rows only, so a list of thousands stays usable.
import { DataTable, type DataTableColumn } from '@/components/ui';
import { money, quantityText } from '@/lib/format';
import { countItems, hiddenRowsText, PREVIEW_ROWS, previewSummary } from '../../lib/importPlan';
import type { ImportItemState, ImportPreviewItem } from '../../types';
import { GROUPS_LISTED_WORDS } from './lib/addRules';

/** What happens to an item, in words (the state of the preview, not a badge). */
const WHAT: Readonly<Record<ImportItemState, string>> = {
  new: 'New',
  changed: 'Cost changed',
  matching: 'Already matches',
};

const COLUMNS: DataTableColumn<ImportPreviewItem>[] = [
  {
    key: 'name',
    label: 'Service Name',
    render: (item) => (
      <>
        {item.name}
        {item.serviceName && item.serviceName !== item.name && (
          <span className="cell-sub">Linked to {item.serviceName}</span>
        )}
      </>
    ),
  },
  { key: 'what', label: 'What happens', render: (item) => WHAT[item.state] },
  {
    key: 'group',
    label: 'Group',
    hide: 'md',
    render: (item) =>
      item.state === 'new' ? (
        (item.category?.name ?? GROUPS_LISTED_WORDS)
      ) : (
        <span className="text-ink3">–</span>
      ),
  },
  {
    key: 'quantity',
    label: 'Quantity',
    hide: 'sm',
    render: (item) => (
      <>
        {quantityText(item)}
        {item.quantityDiffers && <span className="cell-sub">The service keeps its own rule.</span>}
      </>
    ),
  },
  {
    key: 'cost',
    label: 'Cost',
    num: true,
    render: (item) => (
      <>
        {money(item.cost)}
        {item.previousCost && <span className="cell-sub">was {money(item.previousCost)}</span>}
      </>
    ),
  },
  {
    key: 'price',
    label: 'Suggested price',
    num: true,
    render: (item) => (item.suggestedPrice ? money(item.suggestedPrice) : '–'),
  },
];

/** The server's answer for each picked service (the first 200 rows), under a line that adds them up. */
export function ImportPreviewTable({ items }: { items: readonly ImportPreviewItem[] }) {
  const hidden = hiddenRowsText(PREVIEW_ROWS, items.length);
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink2" aria-live="polite">
        {previewSummary(countItems(items))}.
      </p>
      <DataTable
        skin="list"
        caption="Import preview"
        columns={COLUMNS}
        rows={items.slice(0, PREVIEW_ROWS)}
        rowKey={(item) => item.supplierServiceId}
        footer={false}
      />
      {hidden && <p className="text-xs text-ink3">{hidden}</p>}
    </div>
  );
}
