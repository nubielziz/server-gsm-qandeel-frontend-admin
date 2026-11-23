// Tests for the pure side of the Pricing view: what an edited cell is, the request each edited row needs (the base price, the whole set of group
// prices with the shop price and `retailPriceSeen`), how a refusal of the server finds its cell, the order boxes and the list the grid asks for.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import type { PriceGridRow } from '../types';
import {
  ORDER_PROBLEM,
  PRICE_PROBLEM,
  RETAIL_BLANK_PROBLEM,
  RETAIL_GROUP_PROBLEM,
  apiMark,
  changedCount,
  figureText,
  gridQuery,
  marginText,
  planOrder,
  planSave,
  refusalOfBase,
  refusalOfOrder,
  refusalOfPrices,
  savedFigure,
  savedText,
  shownText,
  withCell,
  withNote,
  withOrder,
  withoutCells,
  type PricesCall,
} from './priceGrid';

// AT&T USA Unlock: a shop price a person typed, a fixed price for Wholesale (group 2) and none for Standard (group 1).
const ROW: PriceGridRow = {
  id: 5,
  name: 'AT&T USA Premier Unlock',
  code: 'IMEI-ATT-USA',
  status: 'active',
  sort: 0,
  categoryId: 4,
  supplier: { id: 3, name: 'Nordic GSM' },
  cost: '13.5000',
  costChangedFrom: null,
  basePrice: '17.2800',
  baseMargin: '3.7800',
  floorPrice: '14.3100',
  belowFloor: false,
  retailPrice: '25.9900',
  retailPriceSource: 'manual',
  retailMargin: '12.4900',
  groupPrices: [
    { groupId: 1, fixedPrice: null, price: '17.2800', margin: '3.7800' },
    { groupId: 2, fixedPrice: '16.9000', price: '16.9000', margin: '3.4000' },
  ],
};
const NO_SHOP: PriceGridRow = {
  ...ROW,
  id: 6,
  retailPrice: null,
  retailPriceSource: null,
  retailMargin: null,
};
const RETAIL_GROUP = 9;
const rows = (...list: PriceGridRow[]) => new Map(list.map((row) => [row.id, row]));
const refused = (
  fieldErrors: Record<string, string[]>,
  extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {},
) => new ApiError({ status: 422, title: 'Check the form', fieldErrors, ...extra });

describe('the text of a cell', () => {
  it('starts from the saved price with at least two decimals, and from nothing where the cell holds none', () => {
    expect(savedText(ROW, 'base')).toBe('17.28');
    expect(savedText(ROW, 'retail')).toBe('25.99');
    expect(savedText(ROW, 'group:2')).toBe('16.90');
    expect(savedText(ROW, 'group:1')).toBe('');
    expect(savedText(NO_SHOP, 'retail')).toBe('');
  });

  it('prints the saved price of a locked cell as a figure, or a dash', () => {
    expect(savedFigure(ROW, 'base')).toBe('$17.28');
    expect(savedFigure(ROW, 'group:2')).toBe('$16.90');
    expect(savedFigure(ROW, 'group:1')).toBe('—');
    expect(savedFigure(NO_SHOP, 'retail')).toBe('—');
  });

  it('shows what was typed before what is saved', () => {
    expect(shownText(ROW, { base: '18' }, 'base')).toBe('18');
    expect(shownText(ROW, { base: '18' }, 'retail')).toBe('25.99');
    expect(shownText(ROW, undefined, 'base')).toBe('17.28');
  });
});

describe('the edits', () => {
  it('keeps what was typed per row and cell, without touching the edits it started from', () => {
    const start = {};
    const next = withCell(start, ROW, 'base', '18.50');
    expect(next).toEqual({ 5: { base: '18.50' } });
    expect(start).toEqual({});
    expect(withCell(next, ROW, 'group:1', '17')).toEqual({ 5: { base: '18.50', 'group:1': '17' } });
  });

  it('drops a cell typed back to its saved price, however it is written, and a row left with nothing', () => {
    const typed = withCell({}, ROW, 'base', '18.50');
    expect(withCell(typed, ROW, 'base', '17.280')).toEqual({});
    expect(withCell({ 5: { base: '18.50', retail: '30' } }, ROW, 'base', '17.28')).toEqual({
      5: { retail: '30' },
    });
  });

  it('treats a blank box over a blank cell as no edit, and a blank box over a price as an edit', () => {
    expect(withCell({}, ROW, 'group:1', '')).toEqual({});
    expect(withCell({}, ROW, 'group:2', '')).toEqual({ 5: { 'group:2': '' } });
  });

  it('takes cells away after a save and counts them', () => {
    const edits = { 5: { base: '18', 'group:1': '17' }, 6: { retail: '30' } };
    expect(changedCount(edits)).toBe(3);
    expect(withoutCells(edits, 5, ['base'])).toEqual({ 5: { 'group:1': '17' }, 6: { retail: '30' } });
    expect(withoutCells(edits, 6, ['retail'])).toEqual({ 5: { base: '18', 'group:1': '17' } });
    expect(changedCount({})).toBe(0);
  });

  it('puts a note under a cell and takes it away', () => {
    const noted = withNote({}, 5, 'base', 'Below the floor.');
    expect(noted).toEqual({ 5: { base: 'Below the floor.' } });
    expect(withNote(noted, 5, 'base', undefined)).toEqual({});
  });
});

describe('the words under a price', () => {
  it('prints a price with three decimals under one dollar and two otherwise, and a dash for none', () => {
    expect(figureText('17.2800')).toBe('$17.28');
    expect(figureText('0.6500')).toBe('$0.650');
    expect(figureText(null)).toBe('—');
  });

  it('prints the sign and the figure of a margin the server worked out', () => {
    expect(marginText('3.7800')).toBe('+ $3.78');
    expect(marginText('-1.2000')).toBe('- $1.20');
    expect(marginText('-0.5000')).toBe('- $0.500');
    expect(marginText('0.0000')).toBe('+ $0.000');
    expect(marginText(null)).toBe('');
  });

  it('says whether the supplier price is in step, moved, or not there', () => {
    expect(apiMark(ROW)).toEqual({ kind: 'sync' });
    expect(apiMark({ ...ROW, costChangedFrom: '12.0000' })).toEqual({ kind: 'moved', was: '12.0000' });
    expect(apiMark({ ...ROW, supplier: null })).toEqual({ kind: 'none' });
    expect(apiMark({ ...ROW, cost: null })).toEqual({ kind: 'none' });
  });
});

describe('planSave', () => {
  it('sends only the base price when only the base price was typed', () => {
    const plan = planSave({ 5: { base: '18.5' } }, rows(ROW), RETAIL_GROUP);
    expect(plan.problems).toEqual({});
    expect(plan.rows).toEqual([{ row: ROW, base: { price: '18.5000' }, prices: null }]);
  });

  it('sends the whole set of group prices when a rank was typed: every saved fixed price, the new one and the shop price as it was', () => {
    const { rows: planned } = planSave({ 5: { 'group:1': '17.10' } }, rows(ROW), RETAIL_GROUP);
    expect(planned).toHaveLength(1);
    expect(planned[0]?.base).toBeNull();
    expect(planned[0]?.prices).toEqual({
      body: {
        prices: [
          { groupId: 1, price: '17.1000' },
          { groupId: 2, price: '16.9000' },
          { groupId: RETAIL_GROUP, price: '25.9900' },
        ],
        retailPriceSeen: '25.9900',
      },
      cells: ['group:1', 'group:2', 'retail'],
      changed: ['group:1'],
    } satisfies PricesCall);
  });

  it('sends a typed shop price and the shop price the row showed, so the server can tell the box was touched', () => {
    const { rows: planned } = planSave({ 5: { retail: '27' } }, rows(ROW), RETAIL_GROUP);
    expect(planned[0]?.prices?.body).toEqual({
      prices: [
        { groupId: 2, price: '16.9000' },
        { groupId: RETAIL_GROUP, price: '27.0000' },
      ],
      retailPriceSeen: '25.9900',
    });
  });

  it('leaves a group out when its box was emptied, and sends no shop row for a service with no shop price', () => {
    const { rows: planned } = planSave({ 6: { 'group:2': '' } }, rows(NO_SHOP), RETAIL_GROUP);
    expect(planned[0]?.prices?.body).toEqual({ prices: [], retailPriceSeen: null });
    expect(planned[0]?.prices?.cells).toEqual([]);
  });

  it('sends the base price first and the group prices with it when both were typed', () => {
    const { rows: planned } = planSave({ 5: { base: '18', 'group:2': '16' } }, rows(ROW), RETAIL_GROUP);
    expect(planned[0]?.base).toEqual({ price: '18.0000' });
    expect(planned[0]?.prices?.changed).toEqual(['group:2']);
  });

  it('keeps a row that cannot be sent out of the request and names its cells', () => {
    const plan = planSave(
      { 5: { base: 'abc', 'group:1': '17' }, 6: { base: '12' } },
      rows(ROW, NO_SHOP),
      RETAIL_GROUP,
    );
    expect(plan.problems).toEqual({ 5: { base: PRICE_PROBLEM } });
    expect(plan.rows.map((planned) => planned.row.id)).toEqual([6]);
    expect(planSave({ 5: { 'group:1': '0' } }, rows(ROW), RETAIL_GROUP).problems).toEqual({
      5: { 'group:1': PRICE_PROBLEM },
    });
    expect(planSave({ 5: { base: '' } }, rows(ROW), RETAIL_GROUP).problems).toEqual({
      5: { base: PRICE_PROBLEM },
    });
  });

  it('does not take the shop price away: an emptied shop box is a problem', () => {
    expect(planSave({ 5: { retail: '' } }, rows(ROW), RETAIL_GROUP).problems).toEqual({
      5: { retail: RETAIL_BLANK_PROBLEM },
    });
  });

  it('refuses to send group prices without the shop group when the shop price would be lost, and only then', () => {
    expect(planSave({ 5: { 'group:1': '17' } }, rows(ROW), undefined).problems).toEqual({
      5: { 'group:1': RETAIL_GROUP_PROBLEM },
    });
    const free = planSave({ 6: { 'group:1': '17' } }, rows(NO_SHOP), undefined);
    expect(free.problems).toEqual({});
    expect(free.rows[0]?.prices?.body.retailPriceSeen).toBeNull();
    // A base price needs no group at all.
    expect(planSave({ 5: { base: '18' } }, rows(ROW), undefined).problems).toEqual({});
  });

  it('skips an edited row it has no snapshot of', () => {
    expect(planSave({ 99: { base: '18' } }, rows(ROW), RETAIL_GROUP)).toEqual({ rows: [], problems: {} });
  });
});

describe('where a refusal goes', () => {
  const call: PricesCall = {
    body: {
      prices: [
        { groupId: 1, price: '17.1000' },
        { groupId: 2, price: '16.9000' },
        { groupId: RETAIL_GROUP, price: '25.9900' },
      ],
      retailPriceSeen: '25.9900',
    },
    cells: ['group:1', 'group:2', 'retail'],
    changed: ['group:1'],
  };

  it('puts the words about the base price under the base cell', () => {
    expect(refusalOfBase(refused({ basePrice: ['Below the floor of $14.31.'] }))).toEqual({
      base: 'Below the floor of $14.31.',
    });
    expect(
      refusalOfBase(new ApiError({ status: 404, title: 'Not found', detail: 'No service has this id.' })),
    ).toEqual({
      base: 'No service has this id.',
    });
  });

  it('puts prices.N.price under the cell of the N-th price sent', () => {
    expect(refusalOfPrices(refused({ 'prices.1.price': ['Below the floor of $14.31.'] }), call)).toEqual({
      'group:2': 'Below the floor of $14.31.',
    });
    expect(
      refusalOfPrices(refused({ 'prices.2.price': ['Below the storefront floor of $19.01.'] }), call),
    ).toEqual({ retail: 'Below the storefront floor of $19.01.' });
    expect(refusalOfPrices(refused({ 'prices.0.groupId': ['Listed twice'] }), call)).toEqual({
      'group:1': 'Listed twice',
    });
  });

  it('puts any other words under every cell that was edited, so a refusal is never silent', () => {
    const forbidden = new ApiError({
      status: 403,
      title: 'Forbidden',
      detail: 'You need the pricing:update permission.',
    });
    expect(refusalOfPrices(forbidden, call)).toEqual({
      'group:1': 'You need the pricing:update permission.',
    });
    expect(refusalOfPrices(refused({ retailPriceSeen: ['Not a price.'] }), call)).toEqual({
      'group:1': 'Not a price.',
    });
  });
});

describe('the order boxes', () => {
  const second: PriceGridRow = { ...ROW, id: 7, sort: 4 };

  it('keeps a typed position and drops it when the saved one is typed back', () => {
    expect(withOrder({}, ROW, '3')).toEqual({ 5: '3' });
    expect(withOrder({ 5: '3' }, ROW, '0')).toEqual({});
    expect(withOrder({}, second, ' 4 ')).toEqual({});
  });

  it('sends whole numbers from 0 to 1,000,000 and names the boxes that hold anything else', () => {
    expect(planOrder({ 5: '3', 7: '1000000' })).toEqual({
      items: [
        { id: 5, sort: 3 },
        { id: 7, sort: 1_000_000 },
      ],
      problems: {},
      tooMany: false,
    });
    const bad = planOrder({ 5: 'x', 6: '-1', 7: '1000001', 8: '2.5', 9: '' });
    expect(bad.items).toEqual([]);
    expect(Object.keys(bad.problems)).toEqual(['5', '6', '7', '8', '9']);
    expect(bad.problems[5]).toBe(ORDER_PROBLEM);
    expect(ORDER_PROBLEM).toBe('Enter a whole number from 0 to 1,000,000.');
  });

  it('says when more than 500 services are typed', () => {
    const many = Object.fromEntries(Array.from({ length: 501 }, (_, index) => [index + 1, String(index)]));
    expect(planOrder(many).tooMany).toBe(true);
    expect(planOrder({ 1: '2' }).tooMany).toBe(false);
  });

  it('puts items.N.id and items.N.sort under the N-th service sent, and the rest in general', () => {
    const items = [
      { id: 5, sort: 3 },
      { id: 7, sort: 1 },
    ];
    expect(refusalOfOrder(refused({ 'items.1.id': ['No service has this id.'] }), items)).toEqual({
      byService: { 7: 'No service has this id.' },
      general: [],
    });
    expect(refusalOfOrder(refused({ items: ['Send at least one service.'] }), items)).toEqual({
      byService: {},
      general: ['Send at least one service.'],
    });
    expect(
      refusalOfOrder(new ApiError({ status: 403, title: 'Forbidden', detail: 'Closed.' }), items).general,
    ).toEqual(['Closed.']);
  });
});

describe('gridQuery', () => {
  const base = { type: 'imei' as const, q: '', group: undefined, page: 1, size: 50 };

  it('asks for the first page in the order merchants see', () => {
    expect(gridQuery(base)).toEqual({
      start: 0,
      end: 50,
      sort: ['sort'],
      order: ['asc'],
      filters: { type: 'imei' },
    });
  });

  it('adds the search, the group and the page, and keeps the order merchants see', () => {
    expect(gridQuery({ ...base, type: 'server', q: 'unlock', group: 4, page: 3, size: 25 })).toEqual({
      start: 50,
      end: 75,
      sort: ['sort'],
      order: ['asc'],
      q: 'unlock',
      filters: { type: 'server', categoryId: 4 },
    });
  });
});
