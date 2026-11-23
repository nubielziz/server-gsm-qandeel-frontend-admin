// The pure side of the Pricing view: what an edited cell of the price grid is, the request each edited row needs, and how a refusal of the
// server finds its cell. The console works out no price here (decision 022): the cost, the margins and the price of each merchant group
// are the server's; this file only reshapes text, picks the rows to send and prints a sign. The server judges every price.
import type { ApiError, Id, ListQuery, Money } from '@/lib/api';
import { price } from '@/lib/format';
import type { ServiceType } from '@/lib/serviceTypes';
import { MAX_ORDER_ITEMS, MAX_SERVICE_SORT } from '../types';
import type { PriceGridRow, ReplaceGroupPricesBody, ServiceOrderItem } from '../types';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from './money';

// ---- Cells and edits ----

/** One cell of a grid row a person can type in: the base price, the shop price, or the fixed price of one merchant group. */
export type GridCell = 'base' | 'retail' | `group:${number}`;

/** The cell of a merchant group. */
export const groupCell = (groupId: Id): GridCell => `group:${groupId}`;

/** What was typed in one row, only for the cells that differ from what the server sent. */
export type RowEdits = Partial<Record<GridCell, string>>;

/** The typed cells of every row that has some, by service id. A cell typed back to its saved text is no edit. */
export type GridEdits = Readonly<Record<number, RowEdits>>;

/** A message about a cell (a refusal of the server or a problem found before sending), by service id. */
export type CellNotes = Readonly<Record<number, Partial<Record<GridCell, string>>>>;

/** The price a cell holds as the server sent it, or `null` when it holds none (no shop price, no fixed price for the group). */
export function savedPrice(row: PriceGridRow, cell: GridCell): Money | null {
  if (cell === 'base') return row.basePrice;
  if (cell === 'retail') return row.retailPrice;
  return row.groupPrices.find((group) => groupCell(group.groupId) === cell)?.fixedPrice ?? null;
}

/** The text a cell's box starts from: the saved price as the box shows it, or empty when the cell holds none. */
export function savedText(row: PriceGridRow, cell: GridCell): string {
  const saved = savedPrice(row, cell);
  return saved === null ? '' : moneyInput(saved);
}

/** What a cell's box shows: what was typed, or the saved text. */
export function shownText(row: PriceGridRow, edits: RowEdits | undefined, cell: GridCell): string {
  return edits?.[cell] ?? savedText(row, cell);
}

// "13.5" and "13.50" are the same price; two blanks are the same; anything else is compared as typed.
function sameText(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (left === '' || right === '') return left === right;
  return isMoneyText(left) && isMoneyText(right) ? sameMoney(left, right) : left === right;
}

/** The edits with one cell set to `text`. A cell typed back to its saved text stops being an edit, and a row with no edit is dropped. */
export function withCell(edits: GridEdits, row: PriceGridRow, cell: GridCell, text: string): GridEdits {
  const current: RowEdits = { ...edits[row.id] };
  if (sameText(text, savedText(row, cell))) delete current[cell];
  else current[cell] = text;
  const { [row.id]: _replaced, ...rest } = edits;
  return Object.keys(current).length === 0 ? rest : { ...rest, [row.id]: current };
}

/** The edits without some cells of one row (the cells a save took), and without the row when none is left. */
export function withoutCells(edits: GridEdits, id: Id, cells: readonly GridCell[]): GridEdits {
  const current: RowEdits = { ...edits[id] };
  for (const cell of cells) delete current[cell];
  const { [id]: _replaced, ...rest } = edits;
  return Object.keys(current).length === 0 ? rest : { ...rest, [id]: current };
}

/** How many cells are edited, all rows together. */
export function changedCount(edits: GridEdits): number {
  return Object.values(edits).reduce((sum, row) => sum + Object.keys(row).length, 0);
}

/** The notes with one cell's message put in or, for `undefined`, taken out. */
export function withNote(notes: CellNotes, id: Id, cell: GridCell, message: string | undefined): CellNotes {
  const row = { ...notes[id] };
  if (message === undefined) delete row[cell];
  else row[cell] = message;
  const { [id]: _replaced, ...rest } = notes;
  return Object.keys(row).length === 0 ? rest : { ...rest, [id]: row };
}

// ---- Words for the figures the server sent ----

/** A price as the grid prints it: three decimals under one dollar, two otherwise; a dash when the server has none. */
export function figureText(value: Money | null): string {
  return value === null ? '—' : price(value);
}

/** The figure a locked cell prints in place of its box: the saved price, or a dash when the cell holds none. */
export function savedFigure(row: PriceGridRow, cell: GridCell): string {
  return figureText(savedPrice(row, cell));
}

/**
 * A margin as the grid prints it under a price: "+ $3.78" or "- $0.50", empty when the server sent none. It prints the server's sign and
 * figure; nothing is added or compared.
 */
export function marginText(margin: Money | null): string {
  if (margin === null) return '';
  const text = margin.trim();
  const negative = text.startsWith('-');
  return `${negative ? '-' : '+'} ${price(negative ? text.slice(1) : text)}`;
}

/** What the API price cell says about the supplier's price: nothing (no supplier or no cost), in step, or moved from an older figure. */
export type ApiMark = { kind: 'none' } | { kind: 'sync' } | { kind: 'moved'; was: Money };

/** The supplier mark of a row: a service with a supplier and a cost is in step unless the server says the cost moved. */
export function apiMark(row: PriceGridRow): ApiMark {
  if (row.supplier === null || row.cost === null) return { kind: 'none' };
  return row.costChangedFrom === null ? { kind: 'sync' } : { kind: 'moved', was: row.costChangedFrom };
}

// ---- Saving prices ----

/** The message under a base or rank box that holds no usable price. The server still judges the amount (the floor). */
export const PRICE_PROBLEM = 'Enter a price greater than zero.';

/** The message under a shop price box that was emptied: the grid does not take a shop price away. */
export const RETAIL_BLANK_PROBLEM = 'Type a shop price, or put the old one back.';

/** The message when the shop group of the merchant groups is not known, so the shop price cannot be sent back. */
export const RETAIL_GROUP_PROBLEM = 'The shop group could not be read. Reload the page and try again.';

/** The group prices of one row as one replace-all request: the cells in the order of `body.prices`, and the cells that were edited. */
export type PricesCall = { body: ReplaceGroupPricesBody; cells: GridCell[]; changed: GridCell[] };

/** What one edited row needs: a base price change, and the replace of its group prices (every rank and the shop price). */
export type RowPlan = { row: PriceGridRow; base: { price: Money } | null; prices: PricesCall | null };

/** The request plan of a save: the rows to send, and the problems found before sending (those rows send nothing). */
export type SavePlan = { rows: RowPlan[]; problems: CellNotes };

// A typed price is usable when it is plain money text above zero; the server still checks the floor.
const usablePrice = (text: string): boolean => isMoneyText(text) && Number(text) > 0;

// The cells of an edited row that cannot be sent as typed.
function problemsOf(row: PriceGridRow, typed: RowEdits, retailGroupId: Id | undefined) {
  const bad: Partial<Record<GridCell, string>> = {};
  const cells = Object.keys(typed) as GridCell[];
  for (const cell of cells) {
    const text = (typed[cell] ?? '').trim();
    if (cell === 'retail' && text === '') bad.retail = RETAIL_BLANK_PROBLEM;
    else if (cell === 'base' && text === '') bad.base = PRICE_PROBLEM;
    else if (text !== '' && !usablePrice(text)) bad[cell] = PRICE_PROBLEM;
  }
  const priceCells = cells.filter((cell) => cell !== 'base');
  // The replace sends the shop row too: without the shop group's id the shop price would be dropped by the save.
  if (
    priceCells.length > 0 &&
    retailGroupId === undefined &&
    (typed.retail !== undefined || row.retailPrice !== null)
  ) {
    for (const cell of priceCells) bad[cell] ??= RETAIL_GROUP_PROBLEM;
  }
  return bad;
}

// The whole set of group prices a save sends: every rank's fixed price (typed or as saved, a blank box sends none) and the shop price.
function pricesCall(row: PriceGridRow, typed: RowEdits, retailGroupId: Id | undefined): PricesCall | null {
  const changed = (Object.keys(typed) as GridCell[]).filter((cell) => cell !== 'base');
  if (changed.length === 0) return null;
  const prices: ReplaceGroupPricesBody['prices'] = [];
  const cells: GridCell[] = [];
  for (const group of row.groupPrices) {
    const cell = groupCell(group.groupId);
    const text = typed[cell]?.trim();
    const value = text === undefined ? group.fixedPrice : text === '' ? null : toMoneyText(text);
    if (value === null) continue;
    prices.push({ groupId: group.groupId, price: value });
    cells.push(cell);
  }
  const retailText = typed.retail?.trim();
  const retail = retailText === undefined ? row.retailPrice : toMoneyText(retailText);
  if (retail !== null && retailGroupId !== undefined) {
    prices.push({ groupId: retailGroupId, price: retail });
    cells.push('retail');
  }
  // `retailPriceSeen` is the shop price the row showed: a shop box nobody touched keeps its price and its rule (backend decision 040).
  return { body: { prices, retailPriceSeen: row.retailPrice }, cells, changed };
}

/**
 * What a save sends. `rowsById` holds each edited row as it was when its first cell was typed (the figures `retailPriceSeen` and the
 * unchanged ranks come from it). A row with a cell that cannot be sent as typed sends nothing and is listed under `problems`; the rest
 * are sent row by row, the base price first (the shop floor starts from it), then the group prices.
 */
export function planSave(
  edits: GridEdits,
  rowsById: ReadonlyMap<number, PriceGridRow>,
  retailGroupId: Id | undefined,
): SavePlan {
  const rows: RowPlan[] = [];
  const problems: Record<number, Partial<Record<GridCell, string>>> = {};
  for (const [key, typed] of Object.entries(edits)) {
    const row = rowsById.get(Number(key));
    if (!row) continue;
    const bad = problemsOf(row, typed, retailGroupId);
    if (Object.keys(bad).length > 0) {
      problems[row.id] = bad;
      continue;
    }
    const base = typed.base === undefined ? null : { price: toMoneyText(typed.base.trim()) };
    const prices = pricesCall(row, typed, retailGroupId);
    if (base || prices) rows.push({ row, base, prices });
  }
  return { rows, problems };
}

/** The message of a refusal, as the cells it belongs to. */
export type Refusals = Partial<Record<GridCell, string>>;

/** The refusal of a base price change: every message of the answer, under the base cell. */
export function refusalOfBase(error: ApiError): Refusals {
  const messages = [...Object.values(error.fieldErrors).flat(), ...error.formErrors];
  return { base: (messages.length > 0 ? messages : [error.detail ?? error.title]).join(' ') };
}

// `prices.2.price` and `prices.2.groupId` name the third price of the body.
const PRICE_PATH = /^prices\.(\d+)\.(price|groupId)$/;

/**
 * The refusal of a replace of group prices: a message about `prices.N.price` goes to the cell of the N-th price sent, and any other
 * message (a missing permission, a service that is gone) goes under every cell that was edited, so a refusal is never silent.
 */
export function refusalOfPrices(error: ApiError, call: PricesCall): Refusals {
  const out: Refusals = {};
  const general = [...error.formErrors];
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const cell = call.cells[Number(PRICE_PATH.exec(field)?.[1] ?? -1)];
    if (cell) out[cell] = [out[cell], ...messages].filter(Boolean).join(' ');
    else general.push(...messages);
  }
  if (general.length === 0 && Object.keys(out).length === 0) general.push(error.detail ?? error.title);
  if (general.length > 0)
    for (const cell of call.changed) out[cell] = [out[cell], ...general].filter(Boolean).join(' ');
  return out;
}

// ---- Saving the order ----

/** The position boxes that were typed, by service id; a box typed back to the saved position is no edit. */
export type OrderEdits = Readonly<Record<number, string>>;

/** The order edits with one box set; a box typed back to the saved position is dropped. */
export function withOrder(edits: OrderEdits, row: PriceGridRow, text: string): OrderEdits {
  const { [row.id]: _replaced, ...rest } = edits;
  return text.trim() === String(row.sort) ? rest : { ...rest, [row.id]: text };
}

/** The words under a position box that is not a whole number the server accepts. */
export const ORDER_PROBLEM = `Enter a whole number from 0 to ${MAX_SERVICE_SORT.toLocaleString('en-US')}.`;

/** What an order save sends: the services to place, or the boxes that hold no usable number (nothing is sent then). */
export type OrderPlan = { items: ServiceOrderItem[]; problems: Record<number, string>; tooMany: boolean };

/** Reads the position boxes into the request. At most `MAX_ORDER_ITEMS` services go in one save. */
export function planOrder(edits: OrderEdits): OrderPlan {
  const items: ServiceOrderItem[] = [];
  const problems: Record<number, string> = {};
  for (const [key, text] of Object.entries(edits)) {
    const value = text.trim();
    if (/^\d+$/.test(value) && Number(value) <= MAX_SERVICE_SORT)
      items.push({ id: Number(key), sort: Number(value) });
    else problems[Number(key)] = ORDER_PROBLEM;
  }
  return { items, problems, tooMany: items.length > MAX_ORDER_ITEMS };
}

/** The refusal of an order save by service id: `items.N.id` and `items.N.sort` name the N-th service sent; anything else is general. */
export function refusalOfOrder(
  error: ApiError,
  items: readonly ServiceOrderItem[],
): { byService: Record<number, string>; general: string[] } {
  const byService: Record<number, string> = {};
  const general = [...error.formErrors];
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const index = /^items\.(\d+)\.(id|sort)$/.exec(field)?.[1];
    const item = index === undefined ? undefined : items[Number(index)];
    if (item) byService[item.id] = [byService[item.id], ...messages].filter(Boolean).join(' ');
    else general.push(...messages);
  }
  if (general.length === 0 && Object.keys(byService).length === 0) general.push(error.detail ?? error.title);
  return { byService, general };
}

// ---- The list the grid asks for ----

/** The page sizes of the grid; the first view of the page lists 50 rows by default. */
export const PRICING_SIZES = [25, 50, 100, 200] as const;
export const PRICING_DEFAULT_SIZE = 50;

/** What the grid's address says: the kind, the text, the group (category), the page and its size. */
export type GridView = {
  type: ServiceType;
  q: string;
  group: Id | undefined;
  page: number;
  size: number;
};

/**
 * The request of a page of the grid, always in the order merchants see (the server's sort key `sort`: category position, then the saved
 * position, then the name), so the order saved with "Set Order" shows at once and the grid reads top to bottom as the merchants' list does.
 */
export function gridQuery({ type, q, group, page, size }: GridView): ListQuery {
  return {
    start: (page - 1) * size,
    end: page * size,
    sort: ['sort'],
    order: ['asc'],
    ...(q ? { q } : {}),
    filters: { type, ...(group === undefined ? {} : { categoryId: group }) },
  };
}
