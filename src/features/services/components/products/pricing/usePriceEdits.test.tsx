// Tests for the unsaved state of the Pricing view: what a typed cell keeps, the snapshot of each edited row that a save is planned from, what a save
// leaves behind (refused cells with the server's words), and the position boxes.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PriceGridRow } from '../../../types';
import { usePriceEdits } from './usePriceEdits';

const ROW: PriceGridRow = {
  id: 5,
  name: 'AT&T USA Premier Unlock',
  code: 'IMEI-ATT-USA',
  status: 'active',
  sort: 0,
  categoryId: 4,
  supplier: null,
  cost: '13.5000',
  costChangedFrom: null,
  basePrice: '17.2800',
  baseMargin: '3.7800',
  floorPrice: '14.3100',
  belowFloor: false,
  retailPrice: '25.9900',
  retailPriceSource: 'manual',
  retailMargin: '12.4900',
  groupPrices: [{ groupId: 1, fixedPrice: null, price: '17.2800', margin: '3.7800' }],
};
const OTHER: PriceGridRow = { ...ROW, id: 6, name: 'Other' };

describe('usePriceEdits', () => {
  it('keeps what was typed and the row as it was when its first cell was typed', () => {
    const { result } = renderHook(() => usePriceEdits());
    act(() => result.current.setCell(ROW, 'base', '18'));
    act(() => result.current.setCell({ ...ROW, basePrice: '17.5000' }, 'group:1', '17'));
    expect(result.current.edits).toEqual({ 5: { base: '18', 'group:1': '17' } });
    expect(result.current.pending).toBe(2);
    expect(result.current.rowsById().get(5)).toBe(ROW);
  });

  it('drops the edit and the snapshot of a row whose cells were all typed back', () => {
    const { result } = renderHook(() => usePriceEdits());
    act(() => result.current.setCell(ROW, 'base', '18'));
    act(() => result.current.setCell(ROW, 'base', '17.28'));
    expect(result.current.edits).toEqual({});
    expect(result.current.pending).toBe(0);
    expect(result.current.rowsById().has(5)).toBe(false);
  });

  it('replaces the snapshot of an edited row with the row the grid read again, and leaves the other rows alone', () => {
    const { result } = renderHook(() => usePriceEdits());
    act(() => result.current.setCell(ROW, 'base', '18'));
    const fresh = {
      ...ROW,
      groupPrices: [{ groupId: 1, fixedPrice: '17.1000', price: '17.1000', margin: '3.6000' }],
    };
    act(() => result.current.syncRows([fresh, OTHER]));
    expect(result.current.rowsById().get(5)).toBe(fresh);
    expect(result.current.rowsById().has(6)).toBe(false);
  });

  it('takes the saved cells away after a save and keeps the refused ones with the words under them', () => {
    const { result } = renderHook(() => usePriceEdits());
    act(() => {
      result.current.setCell(ROW, 'base', '18');
      result.current.setCell(OTHER, 'base', '1');
    });
    act(() =>
      result.current.applySave({
        rows: [
          { id: 5, saved: ['base'], refused: {} },
          { id: 6, saved: [], refused: { base: 'Below the floor.' } },
        ],
        problems: {},
      }),
    );
    expect(result.current.edits).toEqual({ 6: { base: '1' } });
    expect(result.current.notes).toEqual({ 6: { base: 'Below the floor.' } });
    expect(result.current.summary).toBe('1 saved, 1 not saved');
    expect(result.current.rowsById().has(5)).toBe(false);
    expect(result.current.rowsById().has(6)).toBe(true);
    // Typing in the refused cell takes its words away.
    act(() => result.current.setCell(OTHER, 'base', '2'));
    expect(result.current.notes).toEqual({});
    expect(result.current.summary).toBeNull();
  });

  it('says nothing when everything was saved, and counts the rows with problems found before sending as not saved', () => {
    const { result } = renderHook(() => usePriceEdits());
    act(() => result.current.setCell(ROW, 'base', '18'));
    act(() => result.current.applySave({ rows: [{ id: 5, saved: ['base'], refused: {} }], problems: {} }));
    expect(result.current.summary).toBeNull();
    act(() => result.current.setCell(OTHER, 'base', 'abc'));
    act(() =>
      result.current.applySave({ rows: [], problems: { 6: { base: 'Enter a price greater than zero.' } } }),
    );
    expect(result.current.summary).toBe('0 saved, 1 not saved');
    expect(result.current.edits).toEqual({ 6: { base: 'abc' } });
  });

  it('throws away every typed cell with discard', () => {
    const { result } = renderHook(() => usePriceEdits());
    act(() => result.current.setCell(ROW, 'base', '18'));
    act(() => result.current.discard());
    expect(result.current.edits).toEqual({});
    expect(result.current.rowsById().size).toBe(0);
  });

  it('keeps typed positions apart from the typed prices, and clears the words of a box typed in again', () => {
    const { result } = renderHook(() => usePriceEdits());
    act(() => result.current.setOrder(ROW, '3'));
    expect(result.current.orders).toEqual({ 5: '3' });
    expect(result.current.pendingOrders).toBe(1);
    expect(result.current.pending).toBe(0);
    act(() => result.current.setOrderProblems({ 5: 'Enter a whole number.' }, 'Nothing was saved.'));
    expect(result.current.orderNotes).toEqual({ 5: 'Enter a whole number.' });
    expect(result.current.orderError).toBe('Nothing was saved.');
    act(() => result.current.setOrder(ROW, '4'));
    expect(result.current.orderNotes).toEqual({});
    expect(result.current.orderError).toBeNull();
    act(() => result.current.finishOrder());
    expect(result.current.orders).toEqual({});
  });
});
