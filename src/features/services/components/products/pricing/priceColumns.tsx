// The columns of the price grid: Service Name, the "$" tool, Purchase Cost, API price, Base Price, Retail Price and one column per merchant group,
// in the list skin. Every figure is the server's (the console prints it); the boxes are the base price, the shop price and the fixed price
// of each group. "Display Enable/Disable Service" puts a box before each service name (no column of its own), "Set Order" adds the Order column.
import { ButtonLink, cx, Icon, type DataTableColumn } from '@/components/ui';
import type { Id } from '@/lib/api';
import { moneyInput } from '../../../lib/money';
import {
  apiMark,
  figureText,
  groupCell,
  marginText,
  savedFigure,
  shownText,
  type CellNotes,
  type GridCell,
  type GridEdits,
  type OrderEdits,
} from '../../../lib/priceGrid';
import { productsPath } from '../../../lib/productsPath';
import type { GridRetailSource, PriceGridRow } from '../../../types';
import type { ServiceType } from '@/lib/serviceTypes';
import { PriceBox } from './PriceBox';
import { noteId } from './usePriceEdits';

/** A permission lock as the grants give it: disabled, with the missing permission named in the title. */
export type Lock = { disabled: boolean; title?: string };

/** Everything the columns need from the view. */
export type GridColumnsInput = {
  type: ServiceType;
  /** The merchant groups (kind b2b) in the order of the columns, and their names when the group list could be read. */
  groupIds: readonly Id[];
  groupNames: ReadonlyMap<Id, string>;
  edits: GridEdits;
  notes: CellNotes;
  orders: OrderEdits;
  orderNotes: Readonly<Record<number, string>>;
  display: boolean;
  ordering: boolean;
  baseLock: Lock;
  rankLock: Lock;
  statusLock: Lock;
  orderLock: Lock;
  /** The service whose switch is being saved, if any. */
  busyId: Id | undefined;
  onCell: (row: PriceGridRow, cell: GridCell, text: string) => void;
  onOrder: (row: PriceGridRow, text: string) => void;
  onStatus: (row: PriceGridRow, active: boolean) => void;
};

const SHADED = 'bg-sunken/50';

/** The word staff read under a shop price. The server sends `rule` or `manual`; a price a person typed reads "typed", as on the shop part. */
const SOURCE_WORD: Readonly<Record<GridRetailSource, string>> = { rule: 'rule', manual: 'typed' };

/** What the read-only Purchase Cost box says when the cost is not its own: the supplier connection sets it (see the API price). */
const COST_FROM_SUPPLIER = 'The cost comes from the supplier connection: see the API price';

/** The columns, in the order of the reference's grid. */
export function priceColumns(input: GridColumnsInput): DataTableColumn<PriceGridRow>[] {
  const { edits, notes } = input;
  const box = (row: PriceGridRow, cell: GridCell, lock: Lock, label: string, placeholder?: string) => ({
    label: `${label} of ${row.name}`,
    value: shownText(row, edits[row.id], cell),
    figure: savedFigure(row, cell),
    changed: edits[row.id]?.[cell] !== undefined,
    lock,
    placeholder,
    note: notes[row.id]?.[cell],
    noteId: noteId(row.id, cell),
    onChange: (text: string) => input.onCell(row, cell, text),
  });

  const columns: DataTableColumn<PriceGridRow>[] = [
    {
      key: 'name',
      label: 'Service Name',
      className: 'min-w-[14rem]',
      render: (row) => (
        <div className="flex items-center gap-2">
          {input.display && (
            <input
              type="checkbox"
              className="check flex-none"
              aria-label={`${row.name} enabled`}
              checked={row.status === 'active'}
              disabled={input.statusLock.disabled || input.busyId === row.id}
              title={input.statusLock.title}
              onChange={(event) => input.onStatus(row, event.target.checked)}
            />
          )}
          <div className="min-w-0">
            <span className={cx('block', row.status === 'disabled' && 'text-ink3')}>{row.name}</span>
            <span className="cell-sub">
              #{row.id}
              {row.status === 'disabled' ? ' · Disabled' : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'tool',
      label: '',
      render: (row) => (
        <ButtonLink
          to={productsPath({ view: 'edit', id: row.id, part: 'pricing', type: input.type })}
          icon
          size="sm"
          variant="ghost"
          aria-label={`Set pricing of ${row.name}`}
          title="Set pricing"
        >
          <Icon name="dollar" className="ic-sm" />
        </ButtonLink>
      ),
    },
    {
      key: 'cost',
      label: 'Purchase Cost',
      render: (row) => {
        // The reference's box: read-only, empty while a supplier connection sets the cost (the API price carries that figure), and filled
        // only for a service that has no supplier, whose own cost is the one on record.
        const own = row.supplier === null ? row.cost : null;
        return (
          <input
            readOnly
            className="input-sm w-24 cursor-default bg-sunken tabular-nums"
            aria-label={`Purchase cost of ${row.name}`}
            placeholder="Purchase"
            value={own === null ? '' : moneyInput(own)}
            title={
              row.supplier !== null
                ? COST_FROM_SUPPLIER
                : own === null
                  ? 'No cost is on record'
                  : 'The cost on record for this service, which has no supplier'
            }
          />
        );
      },
    },
    {
      key: 'api',
      label: 'API price',
      render: (row) => {
        const mark = apiMark(row);
        if (mark.kind === 'none') {
          return (
            <span
              className="text-ink3"
              title={row.supplier === null ? 'No supplier is linked' : 'No cost is on record'}
            >
              —
            </span>
          );
        }
        return (
          <>
            <strong className="block font-semibold tabular-nums">{figureText(row.cost)}</strong>
            <span className="cell-sub flex items-center gap-1" title={row.supplier?.name}>
              {mark.kind === 'sync' ? (
                <>
                  <Icon name="check" className="ic-xs flex-none text-good-fg" />
                  <span className="sr-only">
                    {`In step with the supplier ${row.supplier?.name ?? ''}`.trim()}
                  </span>
                </>
              ) : (
                <>
                  <Icon name="arrowUp" className="ic-xs flex-none text-warn-fg" />
                  <span className="whitespace-nowrap text-warn-fg">{`Moved, was ${figureText(mark.was)}`}</span>
                  <span className="sr-only">{` at ${row.supplier?.name ?? 'the supplier'}`}</span>
                </>
              )}
            </span>
          </>
        );
      },
    },
    {
      key: 'base',
      label: 'Base Price [USD]',
      className: SHADED,
      render: (row) => (
        <PriceBox {...box(row, 'base', input.baseLock, 'Base price')}>
          <span className="cell-sub">{marginText(row.baseMargin) || '—'}</span>
          {row.belowFloor && (
            <span className="cell-sub text-crit-fg" title={`The floor is ${figureText(row.floorPrice)}`}>
              Under the floor
            </span>
          )}
        </PriceBox>
      ),
    },
    {
      key: 'retail',
      label: 'Retail Price [USD]',
      className: SHADED,
      render: (row) => (
        <PriceBox {...box(row, 'retail', input.rankLock, 'Shop price', 'None')}>
          {row.retailPrice === null ? (
            <span className="cell-sub">Not on the shop</span>
          ) : (
            <span className="cell-sub flex gap-1.5">
              <span>{row.retailPriceSource === null ? '' : SOURCE_WORD[row.retailPriceSource]}</span>
              <span>{marginText(row.retailMargin)}</span>
            </span>
          )}
        </PriceBox>
      ),
    },
    ...input.groupIds.map((groupId): DataTableColumn<PriceGridRow> => ({
      key: `group-${groupId}`,
      label: `${input.groupNames.get(groupId) ?? `Group #${groupId}`} [USD]`,
      render: (row) => {
        const cell = row.groupPrices.find((entry) => entry.groupId === groupId);
        const name = input.groupNames.get(groupId) ?? `Group #${groupId}`;
        return (
          <PriceBox {...box(row, groupCell(groupId), input.rankLock, `${name} price`, 'Base')}>
            <span className="cell-sub flex gap-1.5">
              <span>{cell ? figureText(cell.price) : '—'}</span>
              {cell && marginText(cell.margin) && <span>{marginText(cell.margin)}</span>}
            </span>
          </PriceBox>
        );
      },
    })),
  ];

  if (input.ordering) {
    columns.splice(1, 0, {
      key: 'order',
      label: 'Order',
      render: (row) => (
        <div className="whitespace-nowrap">
          <input
            className="input-sm w-16 tabular-nums"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Position of ${row.name}`}
            aria-invalid={input.orderNotes[row.id] ? true : undefined}
            disabled={input.orderLock.disabled}
            title={input.orderLock.title}
            value={input.orders[row.id] ?? String(row.sort)}
            onChange={(event) => input.onOrder(row, event.target.value)}
          />
          {input.orderNotes[row.id] && (
            <span className="mt-0.5 block text-xs text-crit-fg">{input.orderNotes[row.id]}</span>
          )}
        </div>
      ),
    });
  }
  return columns;
}
