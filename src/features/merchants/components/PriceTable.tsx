// PriceTable: a merchant's fixed prices (service, base, group price, override, floor, edit and remove). Ports the overrides table
// of merPricingTab in 42-p-merchants.js, with the group price beside the override instead of the demo's second table (MISMATCHES M50).
import { Button, DataTable, Icon, type DataTableColumn } from '@/components/ui';
import { TYPE_LABEL } from '@/features/orders';
import { money } from '@/lib/format';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import type { ClientPrice } from '../types';

export interface PriceTableProps {
  rows: readonly ClientPrice[];
  grants: MerchantGrants;
  onEdit: (price: ClientPrice) => void;
  onRemove: (price: ClientPrice) => void;
}

const DASH = <span className="text-ink3">–</span>;

// "imei" is "IMEI" in the demo's words; a type the console does not know is shown as the server sent it.
const typeWord = (type: string): string =>
  Object.hasOwn(TYPE_LABEL, type) ? TYPE_LABEL[type as keyof typeof TYPE_LABEL] : type;

/** Draws the overrides with an edit and a remove button on each row. */
export function PriceTable({ rows, grants, onEdit, onRemove }: PriceTableProps) {
  const updateLock = grants.needs('pricing:update');
  const deleteLock = grants.needs('pricing:delete');
  const columns: DataTableColumn<ClientPrice>[] = [
    {
      key: 'service',
      label: 'Service',
      render: (row) => (
        <>
          {row.service.name}
          {row.service.type && <p className="text-2xs text-ink3">{typeWord(row.service.type)}</p>}
        </>
      ),
    },
    {
      key: 'base',
      label: 'Base',
      num: true,
      hide: 'sm',
      render: (row) => (row.service.basePrice ? money(row.service.basePrice) : DASH),
    },
    {
      key: 'group',
      label: 'Group price',
      num: true,
      render: (row) => (row.groupPrice ? money(row.groupPrice) : DASH),
    },
    {
      key: 'override',
      label: 'Override',
      num: true,
      render: (row) => <span className="font-medium">{money(row.price)}</span>,
    },
    {
      key: 'floor',
      label: 'Floor',
      num: true,
      hide: 'md',
      render: (row) =>
        row.service.floorPrice ? <span className="text-ink3">{money(row.service.floorPrice)}</span> : DASH,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-20',
      render: (row) => (
        <span className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            icon
            aria-label={`Edit override for ${row.service.name}`}
            disabled={updateLock.disabled}
            title={updateLock.title}
            onClick={() => onEdit(row)}
          >
            <Icon name="edit" className="ic-sm" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon
            aria-label={`Remove override for ${row.service.name}`}
            disabled={deleteLock.disabled}
            title={deleteLock.title}
            onClick={() => onRemove(row)}
          >
            <Icon name="x" className="ic-sm" />
          </Button>
        </span>
      ),
    },
  ];

  return <DataTable caption="Client overrides" columns={columns} rows={rows} rowKey={(row) => row.id} />;
}
